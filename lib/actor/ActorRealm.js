export class ActorRealm {
    constructor() {
        this.actors = new Map();
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
    async sendMessage(actorName, message) {
        const actor = this.actors.get(actorName);
        if (actor) {
            actor.onMessage(message);
        }
    }
    queryAllActorNames() {
        return [...this.actors.keys()];
    }
}
//# sourceMappingURL=ActorRealm.js.map