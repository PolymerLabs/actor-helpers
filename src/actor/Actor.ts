declare global {
  interface ActorMessageType {
    "actor.lookup": ValidActorMessageName;
    "actor.lookup.exists": ValidActorMessageName;
  }
}

export type ValidActorMessageName = keyof ActorMessageType;

export abstract class Actor<T, R = void> {
  readonly initPromise: Promise<void>;
  actorName?: ValidActorMessageName;

  constructor() {
    this.initPromise = this.init();
  }

  async init(): Promise<void> {}
  abstract onMessage(message: T): R;
}

interface StoredMessage<ActorName extends ValidActorMessageName> {
  recipient: string;
  detail: ActorMessageType[ActorName];
  timestamp: Date;
}

interface BroadcastChannelPing<ActorName extends ValidActorMessageName> {
  actorName: ActorName;
}

declare global {
  interface IDBCursor {
    value: any;
  }
}

class MessageStore {
  private database!: IDBDatabase;
  private readonly ready: Promise<void>;

  constructor() {
    this.ready = this.init();
  }

  init() {
    return new Promise<void>((resolve, reject) => {
      const connection = indexedDB.open("MESSAGE-STORE-ACTOR-DATABASE");

      connection.onerror = () => {
        reject(connection.error);
      };

      connection.onsuccess = () => {
        this.database = connection.result;
        resolve();
      };

      connection.onupgradeneeded = () => {
        this.database = connection.result;

        if (!this.database.objectStoreNames.contains("MESSAGES")) {
          this.database.createObjectStore("MESSAGES", {
            autoIncrement: true
          });
        }
      };
    });
  }

  async getMessagesForActor<ActorName extends ValidActorMessageName>(
    name: ActorName,
    { purgeOnRead = true }: { purgeOnRead?: boolean } = {}
  ) {
    await this.ready;
    const transaction = this.database.transaction("MESSAGES", "readwrite");

    const cursorRequest = transaction.objectStore("MESSAGES").openCursor();

    return new Promise<Array<StoredMessage<ActorName>>>((resolve, reject) => {
      const messages: Array<StoredMessage<ActorName>> = [];

      cursorRequest.onerror = () => {
        reject(cursorRequest.error);
      };

      cursorRequest.onsuccess = () => {
        const cursor: IDBCursor | null = cursorRequest.result;

        if (cursor) {
          const value = cursor.value as StoredMessage<ActorName>;

          if (value.recipient === name) {
            messages.push(value);

            if (purgeOnRead) {
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

  async putMessageForActor<ActorName extends ValidActorMessageName>(
    recipient: ActorName,
    detail: ActorMessageType[ActorName]
  ) {
    await this.ready;
    const transaction = this.database.transaction("MESSAGES", "readwrite");

    return new Promise<void>((resolve, reject) => {
      transaction.onerror = () => {
        reject(transaction.error);
      };

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.objectStore("MESSAGES").add({
        recipient,
        detail,
        timestamp: Date.now()
      });
    });
  }
}

const POLLING_INTERVAL = 100;

const messageStore = new MessageStore();

async function lookForMessageOfActor<ActorName extends ValidActorMessageName>(
  name: ActorName
) {
  return messageStore.getMessagesForActor(name);
}

function hookupWithBroadcastChannel<ActorName extends ValidActorMessageName>(
  name: ActorName,
  actor: Actor<ActorMessageType[ActorName]>
) {
  const channel = new BroadcastChannel(name);

  const channelCallback = async (event: MessageEvent) => {
    const { actorName } = event.data as BroadcastChannelPing<ActorName>;

    if (actorName !== name) {
      return;
    }

    const messages = await lookForMessageOfActor(name);

    for (const message of messages) {
      actor.onMessage(message.detail);
    }
  };

  channel.addEventListener("message", channelCallback);

  return () => {
    channel.close();
  };
}

function hookupWithPolling<ActorName extends ValidActorMessageName>(
  name: ActorName,
  actor: Actor<ActorMessageType[ActorName]>
) {
  let timeout = -1;

  const pollCallback = async () => {
    const messages = await lookForMessageOfActor(name);

    for (const message of messages) {
      actor.onMessage(message.detail);
    }

    timeout = setTimeout(pollCallback, POLLING_INTERVAL);
  };

  timeout = setTimeout(pollCallback, POLLING_INTERVAL);

  return () => {
    self.clearTimeout(timeout);
  };
}

export async function hookup<ActorName extends ValidActorMessageName>(
  name: ActorName,
  actor: Actor<ActorMessageType[ActorName]>,
  { ignoreExistingMessages = true }: { ignoreExistingMessages?: boolean } = {}
) {
  actor.actorName = name;
  await actor.initPromise;

  const messages = await lookForMessageOfActor(name);

  if (!ignoreExistingMessages) {
    for (const message of messages) {
      actor.onMessage(message.detail);
    }
  }

  let hookdown: () => void;

  if ("BroadcastChannel" in self) {
    hookdown = hookupWithBroadcastChannel(name, actor);
  } else {
    hookdown = hookupWithPolling(name, actor);
  }

  return hookdown;
}

export function lookup<ActorName extends ValidActorMessageName>(
  actorName: ActorName
) {
  let channel: BroadcastChannel;

  if ("BroadcastChannel" in self) {
    channel = new BroadcastChannel(actorName);
  }

  return {
    async send(message: ActorMessageType[ActorName]) {
      await messageStore.putMessageForActor(actorName, message);

      if (channel) {
        channel.postMessage({
          actorName
        });
      }
    }
  };
}
