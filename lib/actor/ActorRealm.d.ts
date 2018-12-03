import { actorMixin, ValidActorMessageName } from "./Actor.js";
export declare class ActorIDBRealm {
    private readonly actors;
    addActor<ActorName extends ValidActorMessageName>(actorName: ActorName, actor: actorMixin<ActorMessageType[ActorName]>): void;
    removeActor<ActorName extends ValidActorMessageName>(actorName: ActorName): void;
    sendMessage<ActorName extends ValidActorMessageName>(actorName: ActorName, message: ActorMessageType[ActorName]): void;
}
