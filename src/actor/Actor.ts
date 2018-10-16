import { MessageBus, ValidMessageBusName } from "../message-bus/MessageBus";

declare global {
  interface MessageBusType {
    "actor.lookup": ValidMessageBusName;
    "actor.lookup.exists": ValidMessageBusName;
  }
}

export abstract class Actor<T, R = void> {
  readonly initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.init();
  }

  abstract async init(): Promise<void>;
  abstract onMessage(message: T): R;
}

export async function hookup<ActorName extends ValidMessageBusName>(
  messageBus: MessageBus,
  actor: Actor<MessageBusType[ActorName]>,
  actorName: ActorName
) {
  messageBus.addEventListener("actor.lookup", async lookupName => {
    if (lookupName === actorName) {
      await actor.initPromise;
      messageBus.dispatchEvent("actor.lookup.exists", actorName);
    }
  });

  messageBus.addEventListener(actorName, detail => {
    actor.onMessage(detail);
  });
}

export interface ActorHandle<ActorName extends ValidMessageBusName> {
  send(detail: MessageBusType[ActorName]): void;
}

export function lookup<ActorName extends ValidMessageBusName>(
  messageBus: MessageBus,
  lookupName: ActorName
): Promise<ActorHandle<ActorName>> {
  return new Promise(resolve => {
    const removeEventListener = messageBus.addEventListener(
      "actor.lookup.exists",
      actorName => {
        if (lookupName === actorName) {
          removeEventListener();

          resolve({
            send(detail: MessageBusType[ActorName]) {
              messageBus.dispatchEvent(actorName, detail);
            }
          });
        }
      }
    );

    messageBus.dispatchEvent("actor.lookup", lookupName);
  });
}
