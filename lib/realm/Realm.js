export class ActorRealm {
    constructor() {
        this.actors = new Map();
        this.bridges = [];
    }
    installBridge(bridge) {
        this.bridges.push(bridge);
    }
    hasActor(actorName) {
        return this.actors.has(actorName);
    }
    async addActor(actorName, actor) {
        if (this.actors.has(actorName)) {
            throw new Error(`Already registered actor with name ${actorName}`);
        }
        this.actors.set(actorName, actor);
    }
    async removeActor(actorName) {
        this.actors.delete(actorName);
    }
    async sendMessage(actorName, message, options = {}) {
        const { shouldBroadcast = true } = options;
        const actor = this.actors.get(actorName);
        if (actor) {
            actor.onMessage(message);
        }
        else if (shouldBroadcast) {
            await Promise.all(this.bridges.map(bridge => bridge.maybeSendToActor(message)));
        }
    }
    queryAllActorNames() {
        return [...this.actors.keys()];
    }
}
//# sourceMappingURL=Realm.js.map