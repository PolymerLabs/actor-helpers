export var BridgeMessageType;
(function (BridgeMessageType) {
    BridgeMessageType[BridgeMessageType["SEND"] = 0] = "SEND";
    BridgeMessageType[BridgeMessageType["LOOKUP"] = 1] = "LOOKUP";
    BridgeMessageType[BridgeMessageType["ANNOUNCE"] = 2] = "ANNOUNCE";
})(BridgeMessageType || (BridgeMessageType = {}));
export class PostMessageBridge {
    constructor(endpoint) {
        this.endpoint = endpoint;
        this.installedRealms = new Set();
        this.waitingResolves = new Map();
        endpoint.addEventListener("message", this.onMessage.bind(this));
    }
    install(realm) {
        realm.addEventListener("actor-send", this.onLocalActorSend.bind(this));
        realm.addEventListener("actor-lookup", this.onLocalActorLookup.bind(this));
        realm.addEventListener("actor-hookup", this.onLocalActorHookup.bind(this));
        this.installedRealms.add(realm);
    }
    onLocalActorHookup(e) {
        const msg = e.detail;
        this.resolveWaiting(msg.actorName);
        this.announceActor(msg.actorName);
    }
    onLocalActorLookup(e) {
        // TODO: Fix typings here
        const msg = e.detail;
        if (this.actorIsLocal(msg.actorName)) {
            msg.resolve();
        }
        this.addWaitingResolver(msg.actorName, msg.resolve);
        // Broadcast
        this.endpoint.postMessage({
            type: BridgeMessageType.LOOKUP,
            actorName: msg.actorName
        });
    }
    addWaitingResolver(actorName, resolver) {
        if (!this.waitingResolves.has(actorName)) {
            this.waitingResolves.set(actorName, []);
        }
        this.waitingResolves.get(actorName).push(resolver);
    }
    onLocalActorSend(e) {
        // TODO: Fix typings here
        // TODO: Be smarter about who we send the message to
        const msg = e.detail;
        // Broadcast message to other local realms
        this.sendToAllLocalRealms(msg.actorName, msg.message, {
            exclude: [msg.sourceRealm]
        });
        // Broadcast message through the postMessage channel
        this.endpoint.postMessage({
            type: BridgeMessageType.SEND,
            actorName: msg.actorName,
            message: msg.message
        });
    }
    sendToAllLocalRealms(actorName, message, opts = {}) {
        const { exclude = [] } = opts;
        for (const realm of this.installedRealms) {
            if (exclude.includes(realm)) {
                continue;
            }
            realm.send(actorName, message, { bubble: false });
        }
    }
    actorIsLocal(actorName) {
        return [...this.installedRealms].some(realm => realm.has(actorName));
    }
    onMessage(ev) {
        const msg = ev.data;
        // @ts-ignore
        this[msg.type](msg);
    }
    [BridgeMessageType.SEND](msg) {
        this.sendToAllLocalRealms(msg.actorName, msg.message);
    }
    announceActor(actorName) {
        this.endpoint.postMessage({
            type: BridgeMessageType.ANNOUNCE,
            actorName: actorName
        });
    }
    [BridgeMessageType.LOOKUP](msg) {
        if (!this.actorIsLocal(msg.actorName)) {
            return;
        }
        this.announceActor(msg.actorName);
    }
    resolveWaiting(actorName) {
        if (!this.waitingResolves.has(actorName)) {
            return;
        }
        const waitingResolves = this.waitingResolves.get(actorName);
        this.waitingResolves.delete(actorName);
        waitingResolves.forEach(f => f());
    }
    [BridgeMessageType.ANNOUNCE](msg) {
        this.resolveWaiting(msg.actorName);
    }
}
//# sourceMappingURL=PostMessageBridge.js.map