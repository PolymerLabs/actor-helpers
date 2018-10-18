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

declare var window: { Mocha: Mocha.MochaGlobals; assert: Chai.Assert };

const { suite, setup, teardown, test } = window.Mocha;
const { assert } = window;

declare global {
  interface MessageBusType {
    "state.action": "INCREMENT" | "DECREMENT";
  }
}

suite("MessageBus", () => {
  let receivingBus: MessageBus;
  let sendingBus: MessageBus;

  setup(() => {
    receivingBus = MessageBus.createEndpoint({ channel: "channel" });
    sendingBus = MessageBus.createEndpoint({ channel: "channel" });
  });

  teardown(() => {
    receivingBus.close();
    sendingBus.close();
  });

  test("can send event to other listener", async () => {
    await new Promise(resolve => {
      receivingBus.addEventListener("state.action", action => {
        assert.equal(action, "INCREMENT");
        resolve();
      });

      sendingBus.dispatchEvent("state.action", "INCREMENT");
    });
  });
});
