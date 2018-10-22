import {
  MessageBus,
  ValidMessageBusName,
  Endpoint
} from "../message-bus/MessageBus.js";

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
  endPoint: Endpoint = MessageBus.createEndpoint({ channel: actorName })
) {
  endPoint.addListener("actor.lookup", async lookupName => {
    if (lookupName !== actorName) {
      return;
    }

    await actor.initPromise;
    endPoint.dispatch("actor.lookup.exists", actorName);
  });

  endPoint.addListener(actorName, detail => {
    actor.onMessage(detail);
  });

  endPoint.dispatch("actor.lookup.exists", actorName);
}

export interface ActorHandle<ActorName extends ValidMessageBusName> {
  send(detail: MessageBusType[ActorName]): void;
}

export function lookup<ActorName extends ValidMessageBusName>(
  lookupName: ActorName,
  endPoint: Endpoint = MessageBus.createEndpoint({ channel: lookupName })
): Promise<ActorHandle<ActorName>> {
  return new Promise(resolve => {
    const removeEventListener = endPoint.addListener(
      "actor.lookup.exists",
      actorName => {
        if (lookupName === actorName) {
          removeEventListener();

          resolve({
            send(detail: MessageBusType[ActorName]) {
              endPoint.dispatch(actorName, detail);
            }
          });
        }
      }
    );

    endPoint.dispatch("actor.lookup", lookupName);
  });
}
