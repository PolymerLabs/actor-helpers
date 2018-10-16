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

import { MessageBus } from "../../message-bus/MessageBus.js";
import { Actor, hookup, lookup } from "../../actor/Actor.js";

declare var window: { Mocha: Mocha.MochaGlobals; assert: Chai.Assert };

const { suite, setup, teardown, test } = window.Mocha;
const { assert } = window;

declare global {
  interface MessageBusType {
    ignoring: "dummy";
    late: "dummy";
  }
}

suite("Actor", () => {
  let receivingBus: MessageBus;
  let sendingBus: MessageBus;

  setup(() => {
    receivingBus = MessageBus.create({ channel: "channel" });
    sendingBus = MessageBus.create({ channel: "channel" });
  });

  teardown(() => {
    receivingBus.close();
    sendingBus.close();
  });

  test("can hookup an actor", async () => {
    await new Promise(async resolve => {
      class IgnoringActor extends Actor<"dummy"> {
        async init() {}
        onMessage() {
          resolve();
        }
      }

      await hookup(receivingBus, new IgnoringActor(), "ignoring");

      sendingBus.dispatchEvent("ignoring", "dummy");
    });
  });

  test("can lookup an actor and send a message", async () => {
    await new Promise(async resolve => {
      class IgnoringActor extends Actor<"dummy"> {
        async init() {}
        onMessage() {
          resolve();
        }
      }

      await hookup(receivingBus, new IgnoringActor(), "ignoring");

      (await lookup(sendingBus, "ignoring")).send("dummy");
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
    await hookup(receivingBus, actor, "late");

    const lookupPromise = lookup(sendingBus, "late");

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
  });
});
