import {
  MessageBus,
  Endpoint,
  ValidMessageBusName
} from "../message-bus/MessageBus.js";

declare global {
  interface MessageBusType {
    "actor.lookup": ValidActorMessageName;
    "actor.lookup.exists": ValidActorMessageName;
  }
  interface ActorMessageType extends MessageBusType {}
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

export async function hookup<ActorName extends ValidActorMessageName>(
  actorName: ActorName,
  actor: Actor<ActorMessageType[ActorName]>,
  endPoint: Endpoint = MessageBus.createEndpoint({ channel: actorName })
) {
  actor.actorName = actorName;
  endPoint.addListener("actor.lookup", async lookupName => {
    if (lookupName !== actorName) {
      return;
    }

    await actor.initPromise;
    endPoint.dispatch("actor.lookup.exists", actorName);
  });

  endPoint.addListener(actorName as any, detail => {
    actor.onMessage(detail);
  });

  endPoint.dispatch("actor.lookup.exists", actorName);
}

export interface ActorHandle<ActorName extends ValidActorMessageName> {
  send(detail: ActorMessageType[ActorName]): void;
}

export function lookup<ActorName extends ValidActorMessageName>(
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
            send(detail: ActorMessageType[ActorName]) {
              endPoint.dispatch(
                actorName as ValidMessageBusName,
                detail as any
              );
            }
          });
        }
      }
    );

    endPoint.dispatch("actor.lookup", lookupName);
  });
}
