/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

declare global {
  interface IDBCursor {
    value: any;
  }
}

// This interval needs to be strictly longer than the time it takes to paint
// 1 frame. E.g. this value needs to be higher than 16ms. Otherwise, the
// IDB connection will starve and run into an endless loop.
const POLLING_INTERVAL = 50;
const DB_PREFIX = "ACTOR-DATABASE";
const OBJECT_STORE_NAME = "LIST";

interface BroadcastChannelPing {
  recipient: string;
}

/**
 * The messages stored in the database.
 */
export interface StoredMessage {
  /**
   * The name of the recipient.
   */
  recipient: string;

  /**
   * The message detail that should be processed by the recipient.
   */
  detail: {};
}

/**
 * A messageStore that can read and write to a specific objectStore in an
 * IndexedDB database. This class is used to implement message passing for
 * actors and is generally not intended to be used for other use cases.
 *
 * To retrieve messages from the store for a recipient, use
 * {@link WatchableMessageStore#popMessages}. To subscribe to newly added
 * messages for a recipient, use {@link WatchableMessageStore#subscribe}.
 * To store a new message for a recipient, use
 * {@link WatchableMessageStore#pushMessage}.
 */
export class WatchableMessageStore {
  private database: Promise<IDBDatabase>;
  private bcc?: BroadcastChannel;
  private dbName: string;
  private objStoreName = OBJECT_STORE_NAME;

  constructor(private name: string) {
    this.dbName = `${DB_PREFIX}.${name}`;
    this.database = this.init();

    if ("BroadcastChannel" in self) {
      this.bcc = new BroadcastChannel(name);
    }
  }

  private init() {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const connection = indexedDB.open(this.dbName);

      connection.onerror = () => {
        reject(connection.error);
      };

      connection.onsuccess = () => {
        resolve(connection.result);
      };

      connection.onupgradeneeded = () => {
        if (!connection.result.objectStoreNames.contains(this.objStoreName)) {
          connection.result.createObjectStore(this.objStoreName, {
            autoIncrement: true
          });
        }
      };
    });
  }

  /**
   * Retrieve all messages for a specific recipient. You can specify with
   * `keepMessage` whether to keep messages after they are processed by
   * the recipient.
   *
   * @param recipient The name of the recipient.
   * @param keepMessage Whether to keep any messages after the recipient has
   *    processed the message.
   */
  async popMessages(
    recipient: string,
    { keepMessage = false }: { keepMessage?: boolean } = {}
  ) {
    const transaction = (await this.database).transaction(
      this.objStoreName,
      "readwrite"
    );

    const cursorRequest = transaction
      .objectStore(this.objStoreName)
      .openCursor();

    return new Promise<StoredMessage[]>((resolve, reject) => {
      const messages: StoredMessage[] = [];

      cursorRequest.onerror = () => {
        reject(cursorRequest.error);
      };

      cursorRequest.onsuccess = () => {
        const cursor: IDBCursor | null = cursorRequest.result;

        if (cursor) {
          const value = cursor.value as StoredMessage;

          if (value.recipient === recipient || recipient === "*") {
            messages.push(value);

            if (!keepMessage) {
              cursor.delete();
            }
          }

          cursor.continue();
        } else {
          resolve(messages);
        }
      };
    });
  }

  /**
   * Store a message with a recipient.
   *
   * @param message The message to store with a recipient and a detail.
   */
  async pushMessage(message: StoredMessage) {
    if (message.recipient === "*") {
      throw new Error("Can’t send a message to reserved name '*'");
    }
    const transaction = (await this.database).transaction(
      this.objStoreName,
      "readwrite"
    );

    return new Promise<void>((resolve, reject) => {
      transaction.onerror = () => {
        reject(transaction.error);
      };

      transaction.oncomplete = () => {
        if (this.bcc) {
          this.bcc.postMessage({
            recipient: message.recipient
          } as BroadcastChannelPing);
        }
        resolve();
      };

      transaction.objectStore(this.objStoreName).add(message);
    });
  }

  private subscribeWithBroadcastChannel(
    recipient: string,
    callback: (entries: StoredMessage[]) => void
  ) {
    const channel = new BroadcastChannel(this.name);

    const channelCallback = async (evt: MessageEvent) => {
      const ping = evt.data as BroadcastChannelPing;

      if (ping.recipient !== recipient) {
        return;
      }

      const messages = await this.popMessages(recipient);

      if (messages.length > 0) {
        callback(messages);
      }
    };

    channel.addEventListener("message", channelCallback);

    // Check for already stored messages immediately
    channelCallback(new MessageEvent("message", { data: { recipient } }));

    return () => {
      channel.close();
    };
  }

  private subscribeWithPolling(
    recipient: string,
    callback: (messages: StoredMessage[]) => void
  ) {
    let timeout = -1;

    const pollCallback = async () => {
      const messages = await this.popMessages(recipient);
      if (messages.length > 0) {
        callback(messages);
      }
      timeout = setTimeout(pollCallback, POLLING_INTERVAL);
    };

    timeout = setTimeout(pollCallback, POLLING_INTERVAL);

    return () => {
      self.clearTimeout(timeout);
    };
  }

  /**
   * Add a callback whenever a new message arrives for the recipient.
   * Depending on the functionality of your browser, this will either use
   * `BroadcastChannel` for fine-grained notification timing. If the browser
   * does not implement `BroadcastChannel`, it falls back to use a polling
   * mechanism. The polling timeout is specified by {@link POLLING_INTERVAL}.
   *
   * @param recipient The name of the recipient.
   * @param callback The callback that is invoked with all new messages.
   */
  subscribe(recipient: string, callback: (messages: StoredMessage[]) => void) {
    let unsubscribe = null;

    if ("BroadcastChannel" in self) {
      unsubscribe = this.subscribeWithBroadcastChannel(recipient, callback);
    } else {
      unsubscribe = this.subscribeWithPolling(recipient, callback);
    }
    return unsubscribe;
  }
}
