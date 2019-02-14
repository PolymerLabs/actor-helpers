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
import { Actor } from "../actor/Actor.js";
import { Realm } from "../realm/Realm.js";
import { PostMessageBridge } from "../bridge/PostMessageBridge.js";
const { suite, test, teardown, setup } = window.Mocha;
suite("PostMessageBridge", () => {
    setup(async function () {
        const { port1, port2 } = new MessageChannel();
        this.realm1 = new Realm();
        this.realm2 = new Realm();
        this.port1 = port1;
        this.port2 = port2;
        this.bridge1 = new PostMessageBridge(port1);
        this.bridge1.install(this.realm1);
        this.bridge2 = new PostMessageBridge(port2);
        this.bridge2.install(this.realm2);
        port1.start();
        port2.start();
    });
    teardown(async function () {
        // lol fix me
    });
    test("sends messages across realms", async function () {
        await new Promise(async (resolve) => {
            const { realm1, realm2 } = this;
            class ResolvingActor extends Actor {
                onMessage() {
                    resolve();
                }
            }
            await realm1.hookup("ignoring1", new ResolvingActor());
            realm2.send("ignoring1", "foo");
        });
    });
    test("allows lookup in the other realm", async function () {
        const { realm1, realm2 } = this;
        class ResolvingActor extends Actor {
            onMessage() { }
        }
        await realm1.hookup("ignoring1", new ResolvingActor());
        await realm2.lookup("ignoring1");
    });
    test("allows blocking lookups in the other realm", async function () {
        await new Promise(async (resolve) => {
            const { realm1, realm2 } = this;
            realm2.lookup("ignoring1").then(() => resolve());
            class ResolvingActor extends Actor {
                onMessage() { }
            }
            await realm1.hookup("ignoring1", new ResolvingActor());
        });
    });
});
//# sourceMappingURL=PostMessageBridge_test.js.map