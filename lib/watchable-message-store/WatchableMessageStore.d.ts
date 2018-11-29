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
declare global {
    interface IDBCursor {
        value: any;
    }
}
/**
 * The messages stored in the database.
 */
export interface StoredMessage {
    /**
     * The name of the recipient.
     */
    recipient: string;
    /**
     * The message detail that should be processed by the recipient.
     */
    detail: {};
}
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
export declare class WatchableMessageStore {
    private name;
    private database;
    private bcc?;
    private dbName;
    private objStoreName;
    lastCursorId: number;
    constructor(name: string);
    private init;
    /**
     * Retrieve all messages for a specific recipient. You can specify with
     * `keepMessage` whether to keep messages after they are processed by
     * the recipient.
     *
     * @param recipient The name of the recipient.
     * @param keepMessage Whether to keep any messages after the recipient has
     *    processed the message.
     */
    popMessages(recipient: string, { keepMessage }?: {
        keepMessage?: boolean;
    }): Promise<StoredMessage[]>;
    /**
     * Store a message with a recipient.
     *
     * @param message The message to store with a recipient and a detail.
     */
    pushMessage(message: StoredMessage): Promise<void>;
    private subscribeWithBroadcastChannel;
    private subscribeWithPolling;
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
    subscribe(recipient: string, callback: (messages: StoredMessage[]) => void): () => void;
}
