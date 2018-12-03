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
    maybeSendToActor(): Promise<void>;
    private initDatabase;
    private onmessage;
    private retrieveMessagesForRealm;
}
