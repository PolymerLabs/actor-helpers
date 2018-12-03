import { ValidActorMessageName } from "../actor/Actor.js";
export interface Bridge {
    maybeSendToActor(actorName: ValidActorMessageName, message: any): Promise<void>;
}
