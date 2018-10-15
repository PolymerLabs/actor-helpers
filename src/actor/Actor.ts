import { MessageBus, ValidMessageBusName } from "../message-bus/MessageBus";

declare global {
  interface MessageBusType {
    "actor.lookup": ValidMessageBusName;
    "actor.lookup.exists": ValidMessageBusName;
  }
}

export abstract class Actor<T, R = void> {
  async _init(messageBus: MessageBus, actorName: ValidMessageBusName) {
    messageBus.addEventListener("actor.lookup", lookupName => {
      if (lookupName === actorName) {
        messageBus.dispatchEvent("actor.lookup.exists", actorName);
      }
    });

    await this.init();
  }
  abstract async init(): Promise<void>;
  abstract onMessage(message: T): R;
}

export async function hookup<ActorName extends ValidMessageBusName>(
  messageBus: MessageBus,
  actor: Actor<MessageBusType[ActorName]>,
  name: ActorName
) {
  await actor._init(messageBus, name);

  messageBus.addEventListener(name, detail => {
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
