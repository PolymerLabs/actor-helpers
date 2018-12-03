import { ValidActorMessageName } from "../actor/Actor.js";
import { ActorRealm } from "../realm/Realm.js";

import { Bridge } from "./Bridge.js";

interface IDBMessage {
  actorName: ValidActorMessageName;
  message: any;
}

const DB_PREFIX = "ACTOR-DATABASE";
const OBJECT_STORE_NAME = "LIST";

export class IDBBridge implements Bridge {
  private readonly bcc = new BroadcastChannel("ACTOR-IDB-BRIDGE");
  private requesting = false;
  private needToRequeue = false;
  private database: Promise<IDBDatabase>;
  private lastCursorId = 0;

  constructor(private realm: ActorRealm) {
    this.bcc.addEventListener("message", this.onmessage.bind(this));
    this.database = this.initDatabase();

    realm.installBridge(this);
  }

  async maybeSendToActor(actorName: ValidActorMessageName, message: any) {
    const database = await this.database;
    const transaction = database.transaction(OBJECT_STORE_NAME, "readwrite");

    return new Promise<void>((resolve, reject) => {
      transaction.onerror = () => {
        reject(transaction.error);
      };

      transaction.oncomplete = () => {
        this.bcc.postMessage({});
        resolve();
      };

      transaction.objectStore(OBJECT_STORE_NAME).add({ actorName, message });
    });
  }

  private initDatabase() {
    return new Promise<IDBDatabase>((resolve, reject) => {
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

  private onmessage() {
    if (this.requesting) {
      this.needToRequeue = true;
      return;
    }

    this.requesting = true;

    setTimeout(async () => {
      const messages = await this.retrieveMessagesForRealm();

      for (const { actorName, message } of messages) {
        this.realm.sendMessage(actorName, message, { shouldBroadcast: false });
      }

      this.requesting = false;

      if (this.needToRequeue) {
        this.needToRequeue = false;
        this.onmessage();
      }
    }, 2);
  }

  private retrieveMessagesForRealm(): Promise<IDBMessage[]> {
    return new Promise(async (resolve, reject) => {
      const database = await this.database;
      const transaction = database.transaction(OBJECT_STORE_NAME, "readwrite");

      const cursorRequest = transaction
        .objectStore(OBJECT_STORE_NAME)
        .openCursor(IDBKeyRange.lowerBound(this.lastCursorId, true));

      const messages: IDBMessage[] = [];

      cursorRequest.onerror = () => {
        reject(cursorRequest.error);
      };

      cursorRequest.onsuccess = () => {
        const cursor: IDBCursor | null = cursorRequest.result;

        if (cursor) {
          const value = cursor.value as IDBMessage;

          if (this.realm.hasActor(value.actorName)) {
            messages.push(value);
            cursor.delete();
          }

          cursor.continue();

          this.lastCursorId = cursor.key as number;
        } else {
          resolve(messages);
        }
      };
    });
  }
}
