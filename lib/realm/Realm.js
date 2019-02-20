export class Realm extends EventTarget {
    constructor() {
        super();
        this.actors = new Map();
        this.onActorMessage = this.onActorMessage.bind(this);
    }
    async hookup(actorName, actor) {
        actor.actorName = actorName;
        actor.realm = this;
        await actor.init();
        this.actors.set(actorName, actor);
        actor.addListener(this.onActorMessage);
        this.dispatchEvent(new CustomEvent("actor-hookup", {
            detail: { actorName, sourceRealm: this }
        }));
        return () => {
            actor.removeListener(this.onActorMessage);
        };
    }
    async lookup(actorName) {
        if (!this.actors.has(actorName)) {
            await new Promise(resolve => {
                this.dispatchEvent(new CustomEvent("actor-lookup", {
                    detail: { actorName, resolve, sourceRealm: this }
                }));
            });
        }
        return {
            send: (msg) => {
                this.send(actorName, msg);
            }
        };
    }
    has(actorName) {
        return this.actors.has(actorName);
    }
    send(actorName, message, options = {}) {
        const { bubble = true } = options;
        if (this.has(actorName)) {
            this.actors.get(actorName).deliver(message);
            return true;
        }
        if (bubble) {
            this.dispatchEvent(new CustomEvent("actor-send", {
                detail: { actorName, message, sourceRealm: this }
            }));
        }
        return false;
    }
    onActorMessage(event) {
        if (isActorEvent(event)) {
            this.send(event.actorName, event.message);
        }
    }
}
function isActorEvent(event) {
    return event.type === "actor-send";
}
//# sourceMappingURL=Realm.js.map