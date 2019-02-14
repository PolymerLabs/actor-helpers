import { Realm } from "../realm/Realm.js";
import { Bridge } from "./Bridge.js";
export declare class IDBBridge implements Bridge {
    private readonly bcc;
    private requesting;
    private needToRequeue;
    private database;
    private lastCursorId;
    private readonly realms;
    constructor();
    install(realm: Realm): void;
    sendToActor(event: CustomEvent): Promise<void>;
    private initDatabase;
    private onmessage;
    private processMessagesForRealm;
}
