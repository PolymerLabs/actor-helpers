import { actorMixin, ValidActorMessageName } from "./Actor.js";

export class ActorIDBRealm {
  private readonly actors = new Map<ValidActorMessageName, actorMixin<any>>();

  addActor<ActorName extends ValidActorMessageName>(
    actorName: ActorName,
    actor: actorMixin<ActorMessageType[ActorName]>
  ) {
    this.actors.set(actorName, actor);
  }

  removeActor<ActorName extends ValidActorMessageName>(actorName: ActorName) {
    this.actors.delete(actorName);
  }

  sendMessage<ActorName extends ValidActorMessageName>(
    actorName: ActorName,
    message: ActorMessageType[ActorName]
  ) {
    const actor = this.actors.get(actorName);

    if (actor) {
      actor.onMessage(message);
    }
  }
}
