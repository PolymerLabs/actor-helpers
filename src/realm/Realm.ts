import { actorMixin, ValidActorMessageName } from "../actor/Actor.js";
import { Bridge } from "../bridge/Bridge.js";

export class ActorRealm {
  private readonly actors = new Map<ValidActorMessageName, actorMixin<any>>();

  private readonly bridges: Bridge[] = [];

  installBridge(bridge: Bridge) {
    this.bridges.push(bridge);
  }

  hasActor<ActorName extends ValidActorMessageName>(actorName: ActorName) {
    return this.actors.has(actorName);
  }

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
    message: ActorMessageType[ActorName],
    options: { shouldBroadcast?: boolean } = {}
  ) {
    const { shouldBroadcast = true } = options;
    const actor = this.actors.get(actorName);

    if (actor) {
      actor.onMessage(message);
    } else if (shouldBroadcast) {
      await Promise.all(
        this.bridges.map(bridge => bridge.maybeSendToActor(message))
      );
    }
  }

  queryAllActorNames(): ValidActorMessageName[] {
    return [...this.actors.keys()];
  }
}
