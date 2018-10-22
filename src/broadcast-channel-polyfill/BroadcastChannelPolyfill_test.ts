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

import { BroadcastChannelPolyfill } from "./BroadcastChannelPolyfill.js";
import { MessageBus, MessageChannel } from "../message-bus/MessageBus.js";

declare var window: { Mocha: Mocha.MochaGlobals; assert: Chai.Assert };

const { suite, setup, teardown, test } = window.Mocha;
const { assert } = window;

declare global {
  interface MessageBusType {
    "state.action": "INCREMENT" | "DECREMENT";
  }
}

declare var Worker: {
  new (url: URL | string, options: { type: string }): Worker;
};

suite("BroadcastChannel polyfill", function() {
  let sendingChannel: MessageChannel;
  let receivingChannel: MessageChannel;

  setup(() => {
    sendingChannel = new BroadcastChannelPolyfill("channel");
    receivingChannel = new BroadcastChannelPolyfill("channel");
  });

  teardown(() => {
    receivingChannel.close();
    sendingChannel.close();
  });

  test("can add single listener", done => {
    receivingChannel.addEventListener("message", ({ data }) => {
      assert.equal(data, "data");
      done();
    });

    sendingChannel.postMessage("data");
  });

  test("calls listener in order", done => {
    let firstCallbackCalled = false;

    receivingChannel.addEventListener("message", ({ data }) => {
      assert.equal(data, "data");
      firstCallbackCalled = true;
    });

    receivingChannel.addEventListener("message", ({ data }) => {
      assert.equal(data, "data");
      assert.isTrue(firstCallbackCalled);
      done();
    });

    sendingChannel.postMessage("data");
  });

  test("does not invoke listeners after postMessage is already called", async () => {
    await new Promise((resolve, reject) => {
      sendingChannel.postMessage("data");

      receivingChannel.addEventListener("message", () => {
        reject(
          new Error(
            `listener should not be invoked after postMessage is already finished`
          )
        );
      });

      setTimeout(() => {
        resolve();
      }, 100);
    });
  });

  test("does not call listeners on itself", async () => {
    await new Promise((resolve, reject) => {
      sendingChannel.addEventListener("message", () => {
        debugger;
        reject(
          new Error(
            `listener should not be invoked on a postMessage of the same channel`
          )
        );
      });

      sendingChannel.postMessage("data");

      setTimeout(() => {
        resolve();
      }, 100);
    });
  });

  test("works in a worker", done => {
    const currentUrl = (import.meta as { url: string }).url;
    const worker = new Worker(
      new URL("BroadcastChannelPolyfilledWorker.js", currentUrl),
      { type: "module" }
    );

    worker.onmessage = () => {
      sendingChannel.addEventListener("message", ({ data }) => {
        assert.equal(data, "worker-message");
        done();
      });

      sendingChannel.postMessage("main-thread-message");
    };

    worker.postMessage("create");
  });

  suite("with MessageBus", () => {
    let receivingBus: MessageBus;
    let sendingBus: MessageBus;

    setup(() => {
      receivingBus = MessageBus.createEndpoint({
        channel: "channel",
        broadcastChannelConstructor: BroadcastChannelPolyfill
      });
      sendingBus = MessageBus.createEndpoint({
        channel: "channel",
        broadcastChannelConstructor: BroadcastChannelPolyfill
      });
    });

    teardown(() => {
      receivingBus.close();
      sendingBus.close();
    });

    test("can send event to other listener", async () => {
      await new Promise(resolve => {
        receivingBus.addListener("state.action", action => {
          assert.equal(action, "INCREMENT");
          resolve();
        });

        sendingBus.dispatch("state.action", "INCREMENT");
      });
    });
  });
});
