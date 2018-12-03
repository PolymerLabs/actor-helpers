import { actorMixin, ValidActorMessageName } from "./Actor.js";

export class ActorRealm {
  private readonly actors = new Map<ValidActorMessageName, actorMixin<any>>();

  async addActor<ActorName extends ValidActorMessageName>(
    actorName: ActorName,
    actor: actorMixin<ActorMessageType[ActorName]>
  ) {
    if (this.actors.has(actorName)) {
      throw new Error(`Already registered actor with name ${actorName}`);
    }

    this.actors.set(actorName, actor);
  }

  async removeActor<ActorName extends ValidActorMessageName>(
    actorName: ActorName
  ) {
    this.actors.delete(actorName);
  }

  async sendMessage<ActorName extends ValidActorMessageName>(
    actorName: ActorName,
    message: ActorMessageType[ActorName]
  ) {
    const actor = this.actors.get(actorName);

    if (actor) {
      actor.onMessage(message);
    }
  }

  queryAllActorNames(): ValidActorMessageName[] {
    return [...this.actors.keys()];
  }
}
