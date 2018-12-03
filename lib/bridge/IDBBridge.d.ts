import { ValidActorMessageName } from "../actor/Actor.js";
import { ActorRealm } from "../realm/Realm.js";
import { Bridge } from "./Bridge.js";
export declare class IDBBridge implements Bridge {
    private realm;
    private readonly bcc;
    private requesting;
    private needToRequeue;
    private database;
    private lastCursorId;
    constructor(realm: ActorRealm);
    maybeSendToActor(actorName: ValidActorMessageName, message: any): Promise<void>;
    private initDatabase;
    private onmessage;
    private retrieveMessagesForRealm;
}
