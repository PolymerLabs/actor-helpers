import { Bridge } from "./Bridge.js";
import { Realm } from "../realm/Realm.js";
import { ValidActorMessageName } from "src/actor/Actor.js";
export interface Endpoint extends EventTarget {
    postMessage(payload: any): void;
}
export declare enum BridgeMessageType {
    SEND = 0,
    LOOKUP = 1,
    ANNOUNCE = 2
}
export interface BridgeSendMessage {
    type: BridgeMessageType.SEND;
    actorName: ValidActorMessageName;
    message: ActorMessageType[keyof ActorMessageType];
}
export interface BridgeLookupMessage {
    type: BridgeMessageType.LOOKUP;
    actorName: ValidActorMessageName;
}
export interface BridgeAnnounceMessage {
    type: BridgeMessageType.ANNOUNCE;
    actorName: ValidActorMessageName;
}
export declare type BridgeMessage = BridgeSendMessage | BridgeLookupMessage | BridgeAnnounceMessage;
export declare class PostMessageBridge implements Bridge {
    private endpoint;
    private installedRealms;
    private waitingResolves;
    constructor(endpoint: Endpoint);
    install(realm: Realm): void;
    private onLocalActorLookup;
    private addWaitingResolver;
    private onLocalActorSend;
    private sendToAllLocalRealms;
    private actorIsLocal;
    private onMessage;
    private [BridgeMessageType.SEND];
    private [BridgeMessageType.LOOKUP];
    private [BridgeMessageType.ANNOUNCE];
}
