const DB_PREFIX = "ACTOR-DATABASE";
const OBJECT_STORE_NAME = "LIST";
export class IDBBridge {
    constructor() {
        this.bcc = new BroadcastChannel("ACTOR-IDB-BRIDGE");
        this.requesting = false;
        this.needToRequeue = false;
        this.lastCursorId = 0;
        this.realms = [];
        this.onmessage = this.onmessage.bind(this);
        this.sendToActor = this.sendToActor.bind(this);
        this.database = this.initDatabase();
        this.bcc.addEventListener("message", this.onmessage);
    }
    install(realm) {
        this.realms.push(realm);
        realm.addEventListener("actor-send", this.sendToActor);
    }
    async sendToActor(event) {
        const database = await this.database;
        const transaction = database.transaction(OBJECT_STORE_NAME, "readwrite");
        return new Promise((resolve, reject) => {
            transaction.onerror = () => {
                reject(transaction.error);
            };
            transaction.oncomplete = () => {
                this.bcc.postMessage({});
                resolve();
            };
            transaction.objectStore(OBJECT_STORE_NAME).add(event.detail);
        });
    }
    initDatabase() {
        return new Promise((resolve, reject) => {
            const connection = indexedDB.open(DB_PREFIX);
            connection.onerror = () => {
                reject(connection.error);
            };
            connection.onsuccess = () => {
                resolve(connection.result);
            };
            connection.onupgradeneeded = () => {
                if (!connection.result.objectStoreNames.contains(OBJECT_STORE_NAME)) {
                    connection.result.createObjectStore(OBJECT_STORE_NAME, {
                        autoIncrement: true
                    });
                }
            };
        });
    }
    onmessage() {
        if (this.requesting) {
            this.needToRequeue = true;
            return;
        }
        this.requesting = true;
        setTimeout(async () => {
            await this.processMessagesForRealm();
            this.requesting = false;
            if (this.needToRequeue) {
                this.needToRequeue = false;
                this.onmessage();
            }
        }, 2);
    }
    processMessagesForRealm() {
        return new Promise(async (resolve, reject) => {
            const database = await this.database;
            const transaction = database.transaction(OBJECT_STORE_NAME, "readwrite");
            const cursorRequest = transaction
                .objectStore(OBJECT_STORE_NAME)
                .openCursor(IDBKeyRange.lowerBound(this.lastCursorId, true));
            cursorRequest.onerror = () => {
                reject(cursorRequest.error);
            };
            cursorRequest.onsuccess = () => {
                const cursor = cursorRequest.result;
                if (cursor) {
                    const value = cursor.value;
                    for (const realm of this.realms) {
                        if (realm.send(value.actorName, value.message, { bubble: false })) {
                            cursor.delete();
                        }
                    }
                    cursor.continue();
                    this.lastCursorId = cursor.key;
                }
                else {
                    resolve();
                }
            };
        });
    }
}
//# sourceMappingURL=IDBBridge.js.map