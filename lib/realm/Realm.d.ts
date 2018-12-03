import { actorMixin, ValidActorMessageName } from "../actor/Actor.js";
import { Bridge } from "../bridge/Bridge.js";
export declare class ActorRealm {
    private readonly actors;
    private readonly bridges;
    installBridge(bridge: Bridge): void;
    hasActor<ActorName extends ValidActorMessageName>(actorName: ActorName): boolean;
    addActor<ActorName extends ValidActorMessageName>(actorName: ActorName, actor: actorMixin<ActorMessageType[ActorName]>): Promise<void>;
    removeActor<ActorName extends ValidActorMessageName>(actorName: ActorName): Promise<void>;
    sendMessage<ActorName extends ValidActorMessageName>(actorName: ActorName, message: ActorMessageType[ActorName], options?: {
        shouldBroadcast?: boolean;
    }): Promise<void>;
    queryAllActorNames(): ValidActorMessageName[];
}
