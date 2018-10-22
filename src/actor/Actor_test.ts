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

import { Actor, hookup, lookup } from "./Actor.js";

declare var window: { Mocha: Mocha.MochaGlobals; assert: Chai.Assert };

const { suite, test } = window.Mocha;
const { assert } = window;

declare global {
  interface MessageBusType {
    ignoring: "dummy";
    late: "dummy";
  }
}

suite("Actor", () => {
  test("can hookup an actor", async () => {
    await new Promise(async resolve => {
      class IgnoringActor extends Actor<"dummy"> {
        onMessage() {
          resolve();
        }
      }

      await hookup("ignoring", new IgnoringActor());
      (await lookup("ignoring")).send("dummy");
    });
  });

  test("can lookup an actor and send a message", async () => {
    await new Promise(async resolve => {
      class IgnoringActor extends Actor<"dummy"> {
        onMessage() {
          resolve();
        }
      }

      await hookup("ignoring", new IgnoringActor());

      (await lookup("ignoring")).send("dummy");
    });
  });

  test("can call lookup before hookup", async () => {
    await new Promise(async resolve => {
      class IgnoringActor extends Actor<"dummy"> {
        onMessage() {
          resolve();
        }
      }

      const lookupPromise = lookup("ignoring");

      setTimeout(async () => {
        await hookup("ignoring", new IgnoringActor());

        lookupPromise.then(actorRef => {
          actorRef.send("dummy");
        });
      }, 5);
    });
  });

  test("init finishes before lookup", async () => {
    let initResolvePromise: undefined | (() => void) = undefined;
    class LateActor extends Actor<"dummy"> {
      init() {
        return new Promise<void>(resolve => {
          initResolvePromise = resolve;
        });
      }
      onMessage() {}
    }

    const actor = new LateActor();
    await hookup("late", actor);

    setTimeout(async () => {
      const lookupPromise = lookup("late");

      const promiseRace = Promise.race([
        lookupPromise.then(() => "lookup"),
        actor.initPromise.then(() => "init")
      ]);

      function isPromise(
        promiseLike: undefined | (() => void)
      ): promiseLike is () => void {
        return promiseLike !== undefined;
      }

      setTimeout(() => {
        if (isPromise(initResolvePromise)) {
          initResolvePromise();
        }
      }, 5);

      assert.equal(await promiseRace, "init");
    }, 5);
  });
});
