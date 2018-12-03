import { actorMixin, ValidActorMessageName } from "./Actor.js";
export declare class ActorRealm {
    private readonly actors;
    addActor<ActorName extends ValidActorMessageName>(actorName: ActorName, actor: actorMixin<ActorMessageType[ActorName]>): Promise<void>;
    removeActor<ActorName extends ValidActorMessageName>(actorName: ActorName): Promise<void>;
    sendMessage<ActorName extends ValidActorMessageName>(actorName: ActorName, message: ActorMessageType[ActorName]): Promise<void>;
    queryAllActorNames(): ValidActorMessageName[];
}
