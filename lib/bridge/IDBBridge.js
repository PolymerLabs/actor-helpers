const DB_PREFIX = "ACTOR-DATABASE";
const OBJECT_STORE_NAME = "LIST";
export class IDBBridge {
    constructor(realm) {
        this.realm = realm;
        this.bcc = new BroadcastChannel("ACTOR-IDB-BRIDGE");
        this.requesting = false;
        this.needToRequeue = false;
        this.lastCursorId = 0;
        this.bcc.addEventListener("message", this.onmessage);
        this.database = this.initDatabase();
        realm.installBridge(this);
    }
    async maybeSendToActor() {
        this.bcc.postMessage({});
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
            const messages = await this.retrieveMessagesForRealm();
            for (const message of messages) {
                this.realm.sendMessage(message.actorName, message.detail, {
                    shouldBroadcast: false
                });
            }
            this.requesting = false;
            if (this.needToRequeue) {
                this.needToRequeue = false;
                this.onmessage();
            }
        }, 2);
    }
    retrieveMessagesForRealm() {
        return new Promise(async (resolve, reject) => {
            const database = await this.database;
            const transaction = database.transaction(OBJECT_STORE_NAME, "readwrite");
            const cursorRequest = transaction
                .objectStore(OBJECT_STORE_NAME)
                .openCursor(IDBKeyRange.lowerBound(this.lastCursorId, true));
            const messages = [];
            cursorRequest.onerror = () => {
                reject(cursorRequest.error);
            };
            cursorRequest.onsuccess = () => {
                const cursor = cursorRequest.result;
                if (cursor) {
                    const value = cursor.value;
                    if (this.realm.hasActor(value.actorName)) {
                        messages.push(value);
                        cursor.delete();
                    }
                    cursor.continue();
                    this.lastCursorId = cursor.key;
                }
                else {
                    resolve(messages);
                }
            };
        });
    }
}
//# sourceMappingURL=IDBBridge.js.map