export class Realm extends EventTarget {
    constructor() {
        super(...arguments);
        this.actors = new Map();
    }
    async hookup(actorName, actor) {
        actor.actorName = actorName;
        // @ts-ignore
        await actor.initPromise;
        this.actors.set(actorName, actor);
        actor.addListener(this.onActorMessage);
        return () => {
            actor.removeListener(this.onActorMessage);
        };
    }
    async lookup(actorName) {
        if (this.actors.has(actorName)) {
            return;
        }
        await new Promise((resolve) => {
            this.dispatchEvent(new CustomEvent('actor-lookup', { detail: { callback: resolve } }));
        });
    }
    send(actorName, message, options = {}) {
        const { bubble = true } = options;
        const actor = this.actors.get(actorName);
        if (actor) {
            actor.deliver(message);
            return true;
        }
        if (bubble) {
            this.dispatchEvent(new CustomEvent('actor-send', { detail: { actorName, message } }));
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
    return (event.type === 'actor-send');
}
//# sourceMappingURL=Realm.js.map