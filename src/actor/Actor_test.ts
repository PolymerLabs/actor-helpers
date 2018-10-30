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

import { Actor, hookup, lookup, initializeQueues } from "./Actor.js";

declare var window: { Mocha: Mocha.MochaGlobals; assert: Chai.Assert };

const { suite, test, teardown } = window.Mocha;
const { assert } = window;

declare global {
  interface ActorMessageType {
    ignoring: "dummy";
    ignoring1: "foo";
    late: "dummy";
  }
}

suite("Actor", () => {
  let hookdown: () => void;

  teardown(async () => {
    if (hookdown) {
      await hookdown();
    }
  });

  test("can hookup an actor", async () => {
    await new Promise(async resolve => {
      class IgnoringActor extends Actor<"foo"> {
        onMessage() {
          resolve();
        }
      }

      hookdown = await hookup("ignoring1", new IgnoringActor());
      await lookup("ignoring1").send("foo");
    });
  });

  test("can lookup an actor and send a message", async () => {
    await new Promise(async resolve => {
      class IgnoringActor extends Actor<"dummy"> {
        onMessage() {
          resolve();
        }
      }

      hookdown = await hookup("ignoring", new IgnoringActor());

      await lookup("ignoring").send("dummy");
    });
  });

  test("can call lookup before hookup", async () => {
    await new Promise(async resolve => {
      class IgnoringActor extends Actor<"dummy"> {
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
    await new Promise(async resolve => {
      class IgnoringActor extends Actor<"dummy"> {
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
    await new Promise(async resolve => {
      class IgnoringActor extends Actor<"dummy"> {
        private propsProcessed = true;
        private constructorDone: boolean;

        constructor() {
          super();
          this.constructorDone = true;
        }

        async init() {
          assert.isTrue(this.propsProcessed);
          assert.isTrue(this.constructorDone);
          resolve();
        }

        onMessage() {}
      }
      hookdown = await hookup("ignoring", new IgnoringActor());
    });
  });

  describe("initializeQueues", function() {
    test("deletes old messages", async () => {
      await new Promise(async (resolve, reject) => {
        lookup("ignoring").send("dummy");
        class IgnoringActor extends Actor<"dummy"> {
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
