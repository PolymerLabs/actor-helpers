export class ActorIDBRealm {
    constructor() {
        this.actors = new Map();
    }
    addActor(actorName, actor) {
        this.actors.set(actorName, actor);
    }
    removeActor(actorName) {
        this.actors.delete(actorName);
    }
    sendMessage(actorName, message) {
        const actor = this.actors.get(actorName);
        if (actor) {
            actor.onMessage(message);
        }
    }
}
//# sourceMappingURL=ActorRealm.js.map