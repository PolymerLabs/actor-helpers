import { Bridge } from "./Bridge.js";
import {
  Realm,
  ActorSendEventDetails,
  ActorLookupEventDetails,
  ActorHookupEventDetails,
  Resolver
} from "../realm/Realm.js";
import { ValidActorMessageName } from "../actor/Actor.js";

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

export type BridgeMessage =
  | BridgeSendMessage
  | BridgeLookupMessage
  | BridgeAnnounceMessage;

export class PostMessageBridge implements Bridge {
  private installedRealms = new Set<Realm>();
  private waitingResolves = new Map<ValidActorMessageName, Resolver[]>();

  constructor(private endpoint: Endpoint) {
    endpoint.addEventListener("message", this.onMessage.bind(this));
  }

  install(realm: Realm) {
    realm.addEventListener("actor-send", this.onLocalActorSend.bind(this));
    realm.addEventListener("actor-lookup", this.onLocalActorLookup.bind(this));
    realm.addEventListener("actor-hookup", this.onLocalActorHookup.bind(this));
    this.installedRealms.add(realm);
  }

  private onLocalActorHookup(e: Event) {
    const msg = (e as CustomEvent).detail as ActorHookupEventDetails;
    this.resolveWaiting(msg.actorName);
    this.announceActor(msg.actorName);
  }

  private onLocalActorLookup(e: Event) {
    // TODO: Fix typings here
    const msg = (e as CustomEvent).detail as ActorLookupEventDetails;

    if (this.actorIsLocal(msg.actorName)) {
      msg.resolve();
    }

    this.addWaitingResolver(msg.actorName, msg.resolve);

    // Broadcast
    this.endpoint.postMessage({
      type: BridgeMessageType.LOOKUP,
      actorName: msg.actorName
    } as BridgeLookupMessage);
  }

  private addWaitingResolver(
    actorName: ValidActorMessageName,
    resolver: Resolver
  ) {
    if (!this.waitingResolves.has(actorName)) {
      this.waitingResolves.set(actorName, []);
    }
    this.waitingResolves.get(actorName)!.push(resolver);
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
    this.endpoint.postMessage({
      type: BridgeMessageType.SEND,
      actorName: msg.actorName,
      message: msg.message
    } as BridgeSendMessage);
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

  private actorIsLocal(actorName: ValidActorMessageName): boolean {
    return [...this.installedRealms].some(realm => realm.has(actorName));
  }

  private onMessage(ev: Event) {
    const msg = (ev as MessageEvent).data as BridgeMessage;
    // @ts-ignore
    this[msg.type](msg);
  }

  private [BridgeMessageType.SEND](msg: BridgeSendMessage) {
    this.sendToAllLocalRealms(msg.actorName, msg.message);
  }

  private announceActor(actorName: ValidActorMessageName) {
    this.endpoint.postMessage({
      type: BridgeMessageType.ANNOUNCE,
      actorName: actorName
    } as BridgeAnnounceMessage);
  }

  private [BridgeMessageType.LOOKUP](msg: BridgeLookupMessage) {
    if (!this.actorIsLocal(msg.actorName)) {
      return;
    }
    this.announceActor(msg.actorName);
  }

  private resolveWaiting(actorName: ValidActorMessageName) {
    if (!this.waitingResolves.has(actorName)) {
      return;
    }
    const waitingResolves = this.waitingResolves.get(actorName)!;
    this.waitingResolves.delete(actorName);
    waitingResolves.forEach(f => f());
  }

  private [BridgeMessageType.ANNOUNCE](msg: BridgeAnnounceMessage) {
    this.resolveWaiting(msg.actorName);
  }
}
