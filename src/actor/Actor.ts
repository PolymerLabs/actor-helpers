declare global {
  interface ActorMessageType {}
}

export type ValidActorMessageName = keyof ActorMessageType;

export abstract class Actor<T, R = void> {
  readonly initPromise: Promise<void>;
  actorName?: ValidActorMessageName;

  constructor() {
    // Run init in the next microtask
    this.initPromise = Promise.resolve().then(() => this.init());
  }

  async init(): Promise<void> {}
  abstract onMessage(message: T): R;
}

interface StoredMessage {
  recipient: string;
  detail: {};
}

declare global {
  interface IDBCursor {
    value: any;
  }
}

const DB_MESSAGES = "MESSAGES";
const DB_PREFIX = "ACTOR-DATABASE";

interface BroadcastChannelPing {
  recipient: string;
}

class WatchableMessageStore {
  private database: Promise<IDBDatabase>;
  private bcc?: BroadcastChannel;
  private dbName: string;
  private objStoreName = "list";

  constructor(private name: string) {
    this.dbName = `${DB_PREFIX}.${name}`;
    if ("BroadcastChannel" in self) {
      this.bcc = new BroadcastChannel(name);
    }
    this.database = this.init();
  }

  init() {
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

// This interval needs to be strictly longer than the time it takes to paint
// 1 frame. E.g. this value needs to be higher than 16ms. Otherwise, the
// IDB connection will starve and run into an endless loop.
const POLLING_INTERVAL = 50;

const messageStore = new WatchableMessageStore(DB_MESSAGES);

export type HookdownCallback = () => Promise<void>;

export async function hookup<ActorName extends ValidActorMessageName>(
  actorName: ActorName,
  actor: Actor<ActorMessageType[ActorName]>,
  { purgeExistingMessages = false }: { purgeExistingMessages?: boolean } = {}
): Promise<HookdownCallback> {
  actor.actorName = actorName;
  await actor.initPromise;

  if (purgeExistingMessages) {
    await messageStore.popMessages(actorName);
  }

  const hookdown = messageStore.subscribe(actorName, messages => {
    for (const message of messages) {
      try {
        actor.onMessage(message.detail as ActorMessageType[ActorName]);
      } catch (e) {
        console.error(e);
      }
    }
  });

  return async () => {
    hookdown();
    await messageStore.popMessages(actorName);
  };
}
export interface ActorHandle<ActorName extends ValidActorMessageName> {
  send(message: ActorMessageType[ActorName]): Promise<void>;
}
export function lookup<ActorName extends ValidActorMessageName>(
  actorName: ActorName
): ActorHandle<ActorName> {
  return {
    async send(message: ActorMessageType[ActorName]) {
      await messageStore.pushMessage({
        recipient: actorName,
        detail: message
      });
    }
  };
}

export async function initializeQueues() {
  await messageStore.popMessages("*");
}
