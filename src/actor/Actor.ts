import { MessageBus, ValidMessageBusName } from "../message-bus/MessageBus.js";

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

  async init(): Promise<void> {}
  abstract onMessage(message: T): R;
}

export async function hookup<ActorName extends ValidMessageBusName>(
  actorName: ActorName,
  actor: Actor<MessageBusType[ActorName]>,
  endPoint: MessageBus = MessageBus.createEndpoint({channel: actorName})
) {
  endPoint.addEventListener("actor.lookup", async lookupName => {
    if (lookupName !== actorName) {
      return;
    }

    await actor.initPromise;
    endPoint.dispatchEvent("actor.lookup.exists", actorName);
  });

  endPoint.addEventListener(actorName, detail => {
    actor.onMessage(detail);
  });

  endPoint.dispatchEvent("actor.lookup.exists", actorName);
}

export interface ActorHandle<ActorName extends ValidMessageBusName> {
  send(detail: MessageBusType[ActorName]): void;
}

export function lookup<ActorName extends ValidMessageBusName>(
  lookupName: ActorName,
  endPoint: MessageBus = MessageBus.createEndpoint({channel: lookupName})
): Promise<ActorHandle<ActorName>> {
  return new Promise(resolve => {
    const removeEventListener = endPoint.addEventListener(
      "actor.lookup.exists",
      actorName => {
        if (lookupName === actorName) {
          removeEventListener();

          resolve({
            send(detail: MessageBusType[ActorName]) {
              endPoint.dispatchEvent(actorName, detail);
            }
          });
        }
      }
    );

    endPoint.dispatchEvent("actor.lookup", lookupName);
  });
}
