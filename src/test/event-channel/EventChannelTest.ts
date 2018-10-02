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
    "state.async-action": "INCREMENT" | "DECREMENT";
    "state.async-update": State;
  }
}

suite("EventChannel", () => {
  let serviceChannel: EventChannel;
  let orchestratorChannel: EventChannel;
  let state: State;

  setup(() => {
    serviceChannel = new EventChannel({ channel: "channel", name: "service" });
    orchestratorChannel = new EventChannel({
      channel: "channel",
      name: "orchestrator"
    });
    state = {
      counter: 0
    };

    serviceChannel.exposeFunction("state.action", "state.update", action => {
      if (action === "DECREMENT") {
        state.counter = state.counter - 1;
      } else if (action === "INCREMENT") {
        state.counter = state.counter + 1;
      }

      return state;
    });

    serviceChannel.exposeFunction(
      "state.async-action",
      "state.async-update",
      async action => {
        if (action === "DECREMENT") {
          state.counter = state.counter - 1;
        } else if (action === "INCREMENT") {
          state.counter = state.counter + 1;
        }

        return new Promise((resolve: (state: State) => void) => {
          setTimeout(() => {
            resolve(state);
          }, 10);
        });
      }
    );
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

  test("can work with async actions", async () => {
    const firstResponse = await orchestratorChannel.requestResponse(
      "state.async-action",
      "state.async-update",
      "INCREMENT"
    );

    assert.equal(firstResponse.counter, 1);

    const secondResponse = await orchestratorChannel.requestResponse(
      "state.async-action",
      "state.async-update",
      "INCREMENT"
    );

    assert.equal(secondResponse.counter, 2);
  });

  test("can wait for other service to be ready", async () => {
    const serviceReady = serviceChannel.serviceReady(["dependency"]);

    new EventChannel({ channel: "channel", name: "dependency" });

    await serviceReady;
  });

  test("can wait for multiple services to be ready", async () => {
    const serviceReady = serviceChannel.serviceReady([
      "dependency1",
      "dependency2"
    ]);

    new EventChannel({ channel: "channel", name: "dependency1" });
    new EventChannel({ channel: "channel", name: "dependency2" });

    await serviceReady;
  });

  test("can wait for service that was already started to be ready", async () => {
    new EventChannel({ channel: "channel", name: "dependency" });

    await new Promise(resolve => {
      setTimeout(async () => {
        await serviceChannel.serviceReady(["dependency"]);

        resolve();
      }, 10);
    });
  });
});
