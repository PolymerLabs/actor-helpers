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
  private database: Promise<IDBDatabase>;

  constructor() {
    this.database = this.init();
  }

  init() {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const connection = indexedDB.open("MESSAGE-STORE-ACTOR-DATABASE");

      connection.onerror = () => {
        reject(connection.error);
      };

      connection.onsuccess = () => {
        resolve(connection.result);
      };

      connection.onupgradeneeded = () => {
        if (!connection.result.objectStoreNames.contains("MESSAGES")) {
          connection.result.createObjectStore("MESSAGES", {
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
    const transaction = (await this.database).transaction(
      "MESSAGES",
      "readwrite"
    );

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
    const transaction = (await this.database).transaction(
      "MESSAGES",
      "readwrite"
    );

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

// This interval needs to be strictly longer than the time it takes to paint
// 1 frame. E.g. this value needs to be higher than 16ms. Otherwise, the
// IDB connection will starve and run into an endless loop.
const POLLING_INTERVAL = 50;

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

export type HookdownCallback = () => Promise<void>;

export async function hookup<ActorName extends ValidActorMessageName>(
  actorName: ActorName,
  actor: Actor<ActorMessageType[ActorName]>,
  { keepExistingMessages = false }: { keepExistingMessages?: boolean } = {}
): Promise<HookdownCallback> {
  actor.actorName = actorName;
  await actor.initPromise;

  const messages = await lookForMessageOfActor(actorName);

  if (keepExistingMessages) {
    for (const message of messages) {
      actor.onMessage(message.detail);
    }
  }

  let hookdown: () => void;

  if ("BroadcastChannel" in self) {
    hookdown = hookupWithBroadcastChannel(actorName, actor);
  } else {
    hookdown = hookupWithPolling(actorName, actor);
  }

  return async () => {
    await lookForMessageOfActor(actorName);
    hookdown();
  };
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
