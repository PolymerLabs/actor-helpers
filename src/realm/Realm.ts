import {actorMixin, ActorSendEvent, ValidActorMessageName} from '../actor/Actor.js';

/**
 * The callback-type which is returned by {@link hookup} that can be used
 * to remove an {@link Actor} from the system.
 */
export type HookdownCallback = () => void;

export class Realm extends EventTarget {
  private readonly actors = new Map<ValidActorMessageName, actorMixin<any>>();

  constructor() {
    super();
    this.onActorMessage = this.onActorMessage.bind(this);
  }

  async hookup(actorName: ValidActorMessageName, actor: actorMixin<any>):
      Promise<HookdownCallback> {
    actor.actorName = actorName;
    // @ts-ignore
    await actor.initPromise;

    this.actors.set(actorName, actor);

    actor.addListener(this.onActorMessage);

    return () => {
      actor.removeListener(this.onActorMessage);
    };
  }

  async lookup(actorName: ValidActorMessageName): Promise<void> {
    if (this.actors.has(actorName)) {
      return;
    }

    await new Promise((resolve) => {
      this.dispatchEvent(
          new CustomEvent('actor-lookup', {detail: {callback: resolve}}));
    });
  }

  send<ActorName extends ValidActorMessageName>(
      actorName: ActorName, message: ActorMessageType[ActorName],
      options: {bubble?: boolean} = {}): boolean {
    const {bubble = true} = options;
    const actor = this.actors.get(actorName);

    if (actor) {
      actor.deliver(message);
      return true;
    }

    if (bubble) {
      this.dispatchEvent(
          new CustomEvent('actor-send', {detail: {actorName, message}}));
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
  return (event.type === 'actor-send');
}
