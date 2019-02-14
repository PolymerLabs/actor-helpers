import { Bridge } from "./Bridge.js";
import { Realm, ActorSendEventDetails } from "../realm/Realm.js";
import { ValidActorMessageName } from "src/actor/Actor.js";

export interface Endpoint extends EventTarget {
  postMessage(payload: any): void;
}

export enum BridgeMessageType {
  SEND,
  LOOKUP,
  ANNOUNCE
}

export interface BridgeSendMessage {
  type: BridgeMessageType.SEND;
  actorName: ValidActorMessageName;
  msg: ActorMessageType[keyof ActorMessageType];
}

export interface BridgeLookupMessage {
  type: BridgeMessageType.LOOKUP;
}

export interface BridgeAnnounceMessage {
  type: BridgeMessageType.ANNOUNCE;
}

export type BridgeMessage =
  | BridgeSendMessage
  | BridgeLookupMessage
  | BridgeAnnounceMessage;

export class PostMessageBridge implements Bridge {
  private installedRealms = new Set<Realm>();

  constructor(private endpoint: Endpoint) {
    endpoint.addEventListener("message", this.onMessage.bind(this));
  }

  install(realm: Realm) {
    realm.addEventListener("actor-send", this.onLocalActorSend.bind(this));
    this.installedRealms.add(realm);
  }

  private onLocalActorSend(e: Event) {
    // TODO: Fix typings here
    // TODO: Be smarter about who we send the message to
    const msg = (e as CustomEvent).detail as ActorSendEventDetails;

    // Broadcast message to other local realms
    this.sendToAllLocalRealms(msg.actorName, msg.message, {
      exclude: [msg.sourceRealm]
    });

    // Broadcast message through the postMessage channel
    this.endpoint.postMessage(msg);
  }

  private onMessage(ev: Event) {
    const msg = (ev as MessageEvent).data as BridgeMessage;
    // @ts-ignore
    this[msg.type](msg);
  }

  private sendToAllLocalRealms<T extends ValidActorMessageName>(
    actorName: T,
    message: ActorMessageType[T],
    opts: { exclude?: Realm[] } = {}
  ) {
    const { exclude = [] } = opts;
    for (const realm of this.installedRealms) {
      if (exclude.includes(realm)) {
        continue;
      }
      realm.send(actorName, message, { bubble: false });
    }
  }

  private [BridgeMessageType.SEND](msg: BridgeSendMessage) {
    this.sendToAllLocalRealms(msg.actorName, msg.msg);
  }

  private [BridgeMessageType.LOOKUP](msg: BridgeLookupMessage) {}

  private [BridgeMessageType.ANNOUNCE](msg: BridgeAnnounceMessage) {}
}
