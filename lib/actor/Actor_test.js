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
import { actorMixin, hookup, lookup, initializeQueues } from "./Actor.js";
const { suite, test, teardown, setup } = window.Mocha;
const { assert } = window;
const FooActor = actorMixin(Object);
const DummyActor = actorMixin(Object);
suite("Actor", () => {
    let hookdown;
    setup(async function () {
        await initializeQueues();
    });
    teardown(async () => {
        if (hookdown) {
            await hookdown();
        }
    });
    test("can hookup an actor", async () => {
        await new Promise(async (resolve) => {
            class IgnoringActor extends FooActor {
                onMessage() {
                    resolve();
                }
            }
            hookdown = await hookup("ignoring1", new IgnoringActor());
            await lookup("ignoring1").send("foo");
        });
    });
    test("can lookup an actor and send a message", async () => {
        await new Promise(async (resolve) => {
            class IgnoringActor extends DummyActor {
                onMessage() {
                    resolve();
                }
            }
            hookdown = await hookup("ignoring", new IgnoringActor());
            await lookup("ignoring").send("dummy");
        });
    });
    test("can call lookup before hookup", async () => {
        await new Promise(async (resolve) => {
            class IgnoringActor extends DummyActor {
                onMessage() {
                    resolve();
                }
            }
            await lookup("ignoring").send("dummy");
            setTimeout(async () => {
                hookdown = await hookup("ignoring", new IgnoringActor());
            }, 100);
        });
    });
    test("can retrieve own actor name", async () => {
        await new Promise(async (resolve) => {
            class IgnoringActor extends DummyActor {
                onMessage() {
                    assert.equal(this.actorName, "ignoring");
                    resolve();
                }
            }
            hookdown = await hookup("ignoring", new IgnoringActor());
            await lookup("ignoring").send("dummy");
        });
    });
    test("constructor finishes before init() is run", async () => {
        await new Promise(async (resolve) => {
            class IgnoringActor extends DummyActor {
                constructor() {
                    super();
                    this.propsProcessed = true;
                    this.constructorDone = true;
                }
                async init() {
                    assert.isTrue(this.propsProcessed);
                    assert.isTrue(this.constructorDone);
                    resolve();
                }
                onMessage() { }
            }
            hookdown = await hookup("ignoring", new IgnoringActor());
        });
    });
    describe("initializeQueues", function () {
        test("deletes old messages", async () => {
            await new Promise(async (resolve, reject) => {
                await lookup("ignoring").send("dummy");
                class IgnoringActor extends DummyActor {
                    onMessage() {
                        reject(Error("Message got delivered anyway"));
                    }
                }
                await initializeQueues();
                hookdown = await hookup("ignoring", new IgnoringActor());
                setTimeout(resolve, 100);
            });
        });
    });
});
//# sourceMappingURL=Actor_test.js.map