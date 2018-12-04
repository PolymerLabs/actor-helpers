import { actorMixin, ValidActorMessageName } from '../actor/Actor.js';
/**
 * The callback-type which is returned by {@link hookup} that can be used
 * to remove an {@link Actor} from the system.
 */
export declare type HookdownCallback = () => void;
export declare class Realm extends EventTarget {
    private readonly actors;
    constructor();
    hookup(actorName: ValidActorMessageName, actor: actorMixin<any>): Promise<HookdownCallback>;
    lookup(actorName: ValidActorMessageName): Promise<void>;
    send<ActorName extends ValidActorMessageName>(actorName: ActorName, message: ActorMessageType[ActorName], options?: {
        bubble?: boolean;
    }): boolean;
    private onActorMessage;
}
