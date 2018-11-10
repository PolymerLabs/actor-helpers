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

import { Actor, hookup, lookup } from "../../lib/Actor.js";

class CounterActor extends Actor {
  constructor() {
    super();
    this.counter = 0;
  }
  init() {}
  async onMessage(action) {
    if (action === "++") {
      this.counter++;
    } else if (action === "--") {
      this.counter--;
    } else {
      throw new Error(`Received invalid counter action: ${action}`);
    }

    (await lookup("state.update")).send(this.counter);
  }
}

hookup("counter", new CounterActor());
