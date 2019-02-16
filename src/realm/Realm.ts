import {
  actorMixin,
  ActorSendEvent,
  ValidActorMessageName
} from "../actor/Actor.js";

/**
 * The callback-type which is returned by {@link hookup} that can be used
 * to remove an {@link Actor} from the system.
 */
export type HookdownCallback = () => void;

export type Resolver = () => void;

export interface ActorSendEventDetails {
  actorName: ValidActorMessageName;
  message: ActorMessageType[keyof ActorMessageType];
  sourceRealm: Realm;
}

export interface ActorLookupEventDetails {
  actorName: ValidActorMessageName;
  resolve: Resolver;
  sourceRealm: Realm;
}

export interface ActorHookupEventDetails {
  actorName: ValidActorMessageName;
  sourceRealm: Realm;
}

export class Realm extends EventTarget {
  private readonly actors = new Map<ValidActorMessageName, actorMixin<any>>();

  constructor() {
    super();
    this.onActorMessage = this.onActorMessage.bind(this);
  }

  async hookup(
    actorName: ValidActorMessageName,
    actor: actorMixin<any>
  ): Promise<HookdownCallback> {
    (actor.actorName as actorMixin<any>["actorName"]) = actorName;
    (actor.realm as actorMixin<any>["realm"]) = this;

    await actor.init();

    this.actors.set(actorName, actor);

    actor.addListener(this.onActorMessage);

    this.dispatchEvent(
      new CustomEvent("actor-hookup", {
        detail: { actorName, sourceRealm: this }
      })
    );

    return () => {
      actor.removeListener(this.onActorMessage);
    };
  }

  async lookup(actorName: ValidActorMessageName): Promise<void> {
    if (this.actors.has(actorName)) {
      return;
    }

    await new Promise(resolve => {
      this.dispatchEvent(
        new CustomEvent("actor-lookup", {
          detail: { actorName, resolve, sourceRealm: this }
        })
      );
    });
  }

  has<ActorName extends ValidActorMessageName>(actorName: ActorName): boolean {
    return this.actors.has(actorName);
  }

  send<ActorName extends ValidActorMessageName>(
    actorName: ActorName,
    message: ActorMessageType[ActorName],
    options: { bubble?: boolean } = {}
  ): boolean {
    const { bubble = true } = options;

    if (this.has(actorName)) {
      this.actors.get(actorName)!.deliver(message);
      return true;
    }

    if (bubble) {
      this.dispatchEvent(
        new CustomEvent("actor-send", {
          detail: { actorName, message, sourceRealm: this }
        })
      );
    }

    return false;
  }

  private onActorMessage(event: Event) {
    if (isActorEvent(event)) {
      this.send(event.actorName, event.message);
    }
  }
}

function isActorEvent(event: Event): event is ActorSendEvent<any> {
  return event.type === "actor-send";
}
