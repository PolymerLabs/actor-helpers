/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
// This interval needs to be strictly longer than the time it takes to paint
// 1 frame. E.g. this value needs to be higher than 16ms. Otherwise, the
// IDB connection will starve and run into an endless loop.
const POLLING_INTERVAL = 50;
const DB_PREFIX = "ACTOR-DATABASE";
const OBJECT_STORE_NAME = "LIST";
/**
 * A messageStore that can read and write to a specific objectStore in an
 * IndexedDB database. This class is used to implement message passing for
 * actors and is generally not intended to be used for other use cases.
 *
 * To retrieve messages from the store for a recipient, use
 * {@link WatchableMessageStore#popMessages}. To subscribe to newly added
 * messages for a recipient, use {@link WatchableMessageStore#subscribe}.
 * To store a new message for a recipient, use
 * {@link WatchableMessageStore#pushMessage}.
 */
export class WatchableMessageStore {
    constructor(name) {
        this.name = name;
        this.objStoreName = OBJECT_STORE_NAME;
        this.lastCursorId = 0;
        this.dbName = `${DB_PREFIX}.${name}`;
        this.database = this.init();
        if ("BroadcastChannel" in self) {
            this.bcc = new BroadcastChannel(name);
        }
    }
    init() {
        return new Promise((resolve, reject) => {
            const connection = indexedDB.open(this.dbName);
            connection.onerror = () => {
                reject(connection.error);
            };
            connection.onsuccess = () => {
                resolve(connection.result);
            };
            connection.onupgradeneeded = () => {
                if (!connection.result.objectStoreNames.contains(this.objStoreName)) {
                    connection.result.createObjectStore(this.objStoreName, {
                        autoIncrement: true
                    });
                }
            };
        });
    }
    /**
     * Retrieve all messages for a specific recipient. You can specify with
     * `keepMessage` whether to keep messages after they are processed by
     * the recipient.
     *
     * @param recipient The name of the recipient.
     * @param keepMessage Whether to keep any messages after the recipient has
     *    processed the message.
     */
    async popMessages(recipient, { keepMessage = false } = {}) {
        const transaction = (await this.database).transaction(this.objStoreName, "readwrite");
        const cursorRequest = transaction
            .objectStore(this.objStoreName)
            .openCursor(IDBKeyRange.lowerBound(this.lastCursorId, true));
        return new Promise((resolve, reject) => {
            const messages = [];
            cursorRequest.onerror = () => {
                reject(cursorRequest.error);
            };
            cursorRequest.onsuccess = () => {
                const cursor = cursorRequest.result;
                if (cursor) {
                    const value = cursor.value;
                    if (value.recipient === recipient || recipient === "*") {
                        messages.push(value);
                        if (!keepMessage) {
                            cursor.delete();
                        }
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
    /**
     * Store a message with a recipient.
     *
     * @param message The message to store with a recipient and a detail.
     */
    async pushMessage(message) {
        if (message.recipient === "*") {
            throw new Error("Can’t send a message to reserved name '*'");
        }
        const transaction = (await this.database).transaction(this.objStoreName, "readwrite");
        return new Promise((resolve, reject) => {
            transaction.onerror = () => {
                reject(transaction.error);
            };
            transaction.oncomplete = () => {
                if (this.bcc) {
                    this.bcc.postMessage({
                        recipient: message.recipient
                    });
                }
                resolve();
            };
            transaction.objectStore(this.objStoreName).add(message);
        });
    }
    subscribeWithBroadcastChannel(recipient, callback) {
        const channel = new BroadcastChannel(this.name);
        const channelCallback = async (evt) => {
            const ping = evt.data;
            if (ping.recipient !== recipient) {
                return;
            }
            const messages = await this.popMessages(recipient);
            if (messages.length > 0) {
                callback(messages);
            }
        };
        channel.addEventListener("message", channelCallback);
        // Check for already stored messages immediately
        channelCallback(new MessageEvent("message", { data: { recipient } }));
        return () => {
            channel.close();
        };
    }
    subscribeWithPolling(recipient, callback) {
        let timeout = -1;
        const pollCallback = async () => {
            const messages = await this.popMessages(recipient);
            if (messages.length > 0) {
                callback(messages);
            }
            timeout = setTimeout(pollCallback, POLLING_INTERVAL);
        };
        timeout = setTimeout(pollCallback, POLLING_INTERVAL);
        return () => {
            self.clearTimeout(timeout);
        };
    }
    /**
     * Add a callback whenever a new message arrives for the recipient.
     * Depending on the functionality of your browser, this will either use
     * `BroadcastChannel` for fine-grained notification timing. If the browser
     * does not implement `BroadcastChannel`, it falls back to use a polling
     * mechanism. The polling timeout is specified by {@link POLLING_INTERVAL}.
     *
     * @param recipient The name of the recipient.
     * @param callback The callback that is invoked with all new messages.
     */
    subscribe(recipient, callback) {
        let unsubscribe = null;
        if ("BroadcastChannel" in self) {
            unsubscribe = this.subscribeWithBroadcastChannel(recipient, callback);
        }
        else {
            unsubscribe = this.subscribeWithPolling(recipient, callback);
        }
        return unsubscribe;
    }
}
//# sourceMappingURL=WatchableMessageStore.js.map