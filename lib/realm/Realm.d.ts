import { actorMixin, ValidActorMessageName, ActorHandle } from "../actor/Actor.js";
/**
 * The callback-type which is returned by {@link hookup} that can be used
 * to remove an {@link Actor} from the system.
 */
export declare type HookdownCallback = () => void;
export declare type Resolver = () => void;
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
export declare class Realm extends EventTarget {
    private readonly actors;
    constructor();
    hookup(actorName: ValidActorMessageName, actor: actorMixin<any>): Promise<HookdownCallback>;
    lookup<ActorName extends ValidActorMessageName>(actorName: ActorName): Promise<ActorHandle<ActorName>>;
    has<ActorName extends ValidActorMessageName>(actorName: ActorName): boolean;
    send<ActorName extends ValidActorMessageName>(actorName: ActorName, message: ActorMessageType[ActorName], options?: {
        bubble?: boolean;
    }): boolean;
    private onActorMessage;
}
