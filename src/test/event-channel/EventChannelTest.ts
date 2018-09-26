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

import { EventChannel } from "../../event-channel/EventChannel.js";

declare var window: { Mocha: Mocha.MochaGlobals; assert: Chai.Assert };

const { suite, setup, teardown, test } = window.Mocha;
const { assert } = window;

interface State {
  counter: number;
}

declare global {
  interface EventChannelType {
    "state.action": "INCREMENT" | "DECREMENT";
    "state.update": State;
  }
}

suite("EventChannel", () => {
  let serviceChannel: EventChannel;
  let orchestratorChannel: EventChannel;
  let state: State;

  setup(() => {
    serviceChannel = new EventChannel();
    orchestratorChannel = new EventChannel();
    state = {
      counter: 0
    };

    serviceChannel.exposeFunction(action => {
      if (action === "DECREMENT") {
        state.counter = state.counter - 1;
      } else if (action === "INCREMENT") {
        state.counter = state.counter + 1;
      }

      return state;
    })("state.action", "state.update");
  });

  teardown(() => {
    serviceChannel.close();
    orchestratorChannel.close();
  });

  test("can send event to other listener", async () => {
    await new Promise(resolve => {
      orchestratorChannel.addEventListener("state.update", ({ counter }) => {
        assert.equal(counter, 1);
        resolve();
      });

      orchestratorChannel.dispatch("state.action", "INCREMENT");
    });
  });

  test("can wait for response callback", async () => {
    const firstResponse = await orchestratorChannel.requestResponse(
      "state.action",
      "state.update",
      "INCREMENT"
    );

    assert.equal(firstResponse.counter, 1);

    const secondResponse = await orchestratorChannel.requestResponse(
      "state.action",
      "state.update",
      "INCREMENT"
    );

    assert.equal(secondResponse.counter, 2);
  });
});
