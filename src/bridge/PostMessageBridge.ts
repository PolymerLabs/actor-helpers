import { Bridge } from "./Bridge.js";
import { Realm } from "../realm/Realm.js";

export interface Endpoint extends EventTarget {
  postMessage(payload: any): void;
}

export class PostMessageBridge implements Bridge {
  private installedRealms = new Set<Realm>();

  constructor(private endpoint: Endpoint) {}

  install(realm: Realm) {
    realm.addEventListener("actor-send", this.onActorSend.bind(this));
    this.installedRealms.add(realm);
  }

  private onActorSend(e: Event) {
    // TODO: Fix typings here
    // TODO: Be smarter about who we send the message to
    const msg = (e as CustomEvent).detail;
    // Broadcast message to other local realms
    for (const realm of this.installedRealms) {
      realm.send(msg.actorName, msg.message);
    }
    // Broadcast message through the postMessage channel
    this.endpoint.postMessage(msg);
  }
}
