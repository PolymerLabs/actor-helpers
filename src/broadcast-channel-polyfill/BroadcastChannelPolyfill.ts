import { MessageChannel } from "../message-bus/MessageBus.js";

const DATABASE_PREFIX = "BROADCAST-CHANNEL-POLYFILL";

const MESSAGES_KEY = "MESSAGES";
const LISTENERS_KEY = "LISTENERS";

const POLLING_INTERVAL = 10;

declare global {
  interface IDBCursor {
    value: any;
  }
}

type ListenerKey = number;

interface MessageValue {
  listeners: ListenerKey[];
  message: {};
}

type MessageCallback = (this: MessageChannel, ev: MessageEvent) => void;

export class BroadcastChannelPolyfill implements MessageChannel {
  readonly name: string;
  private readonly listenerCounter = new Map<
    MessageCallback,
    { interval: number; counter: number }
  >();

  constructor(channel: string) {
    this.name = channel;
  }

  /**
   * The order of creating a database connection matters. This means that whenever we want to interact with a database, we have to open the connection in order.
   * If you do not enforce this ordering, callbacks will be executed in the order that `BroadcastChannelPolyfill` objects were created.
   */
  private _lazilyInstantiateDatabase = (() => {
    let database: IDBDatabase;

    return async () => {
      if (database) {
        return database;
      }

      database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(`${DATABASE_PREFIX}-${this.name}`);

        request.onerror = error => {
          reject(error);
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onupgradeneeded = async () => {
          const database = request.result as IDBDatabase;

          if (!database.objectStoreNames.contains(MESSAGES_KEY)) {
            database.createObjectStore(MESSAGES_KEY, {
              autoIncrement: true
            });
          }

          if (!database.objectStoreNames.contains(LISTENERS_KEY)) {
            database
              .createObjectStore(LISTENERS_KEY, {
                keyPath: "id",
                autoIncrement: true
              })
              .createIndex("id", "id");
          }
        };
      });

      return database;
    };
  })();

  async postMessage(message: {}) {
    const database = await this._lazilyInstantiateDatabase();
    const transaction = database.transaction(
      [LISTENERS_KEY, MESSAGES_KEY],
      "readwrite"
    );

    const listenersCursorRequest = transaction
      .objectStore(LISTENERS_KEY)
      .openCursor();

    const listeners: string[] = [];

    listenersCursorRequest.onsuccess = () => {
      const cursor = listenersCursorRequest.result as IDBCursor;

      if (cursor) {
        const counter = cursor.value.counter;

        // Do not send messages to listeners we have on ourself.
        // See Step 8 of https://html.spec.whatwg.org/multipage/web-messaging.html#dom-broadcastchannel-postmessage
        if (
          [...this.listenerCounter.values()]
            .map(listener => listener.counter)
            .indexOf(counter) === -1
        ) {
          listeners.push(counter);
        }
        cursor.continue();
      } else {
        transaction.objectStore(MESSAGES_KEY).add({
          listeners,
          message
        });
      }
    };
  }

  async addEventListener(
    _type: "message",
    listener: MessageCallback,
    _options?: boolean | AddEventListenerOptions
  ) {
    const database = await this._lazilyInstantiateDatabase();
    const transaction = database.transaction(LISTENERS_KEY, "readwrite");
    const listenersStore = transaction.objectStore(LISTENERS_KEY);
    const countRequest = listenersStore
      .index("id")
      .openCursor(undefined, "prev");

    countRequest.onsuccess = () => {
      const currentCounter =
        (countRequest.result && countRequest.result.value.id) || 0;

      transaction
        .objectStore(LISTENERS_KEY)
        .add({ counter: currentCounter }).onsuccess = () => {
        const interval = setInterval(() => {
          const cursorRequest = database
            .transaction(MESSAGES_KEY, "readwrite")
            .objectStore(MESSAGES_KEY)
            .openCursor();

          cursorRequest.onerror = error => {
            throw new Error(`Error: ${error}`);
          };

          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result as IDBCursor;

            if (cursor) {
              const value = cursor.value as MessageValue;
              const listenerIndex = value.listeners.indexOf(currentCounter);

              if (listenerIndex !== -1) {
                listener.call(this, { data: value.message });

                value.listeners.splice(listenerIndex, 1);

                if (value.listeners.length === 0) {
                  cursor.delete();
                } else {
                  cursor.update({
                    listeners: value.listeners,
                    message: value.message
                  });
                }
              }

              cursor.continue();
            }
          };
        }, POLLING_INTERVAL);

        this.listenerCounter.set(listener, {
          interval,
          counter: currentCounter
        });
      };
    };
  }

  removeEventListener(
    _type: "message",
    listener: (this: MessageChannel, ev: MessageEvent) => void,
    _options?: boolean | EventListenerOptions
  ) {
    const listenerInterval = this.listenerCounter.get(listener);

    if (listenerInterval) {
      clearInterval(listenerInterval.interval);
      this.listenerCounter.delete(listener);
    }
  }

  async close() {
    const database = await this._lazilyInstantiateDatabase();

    const transaction = database.transaction(
      [MESSAGES_KEY, LISTENERS_KEY],
      "readwrite"
    );
    const listenersStore = transaction.objectStore(LISTENERS_KEY);

    const counters: ListenerKey[] = [];

    for (const { interval, counter } of this.listenerCounter.values()) {
      clearInterval(interval);
      listenersStore.delete(counter);
      counters.push(counter);
    }

    this.listenerCounter.clear();

    const messageCursorRequest = transaction
      .objectStore(MESSAGES_KEY)
      .openCursor();

    messageCursorRequest.onsuccess = () => {
      const cursor = messageCursorRequest.result as IDBCursor;

      if (cursor) {
        const value = cursor.value as MessageValue;

        const listeners = value.listeners.filter(
          listener => counters.indexOf(listener) === -1
        );

        if (listeners.length === 0) {
          cursor.delete();
        } else {
          cursor.update({
            listeners,
            message: value.message
          });
        }

        cursor.continue();
      } else {
        database.close();
      }
    };
  }
}
