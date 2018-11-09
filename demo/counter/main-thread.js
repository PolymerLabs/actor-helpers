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

import { Actor, hookup, lookup, initializeQueues } from "../../lib/Actor.js";

class UIActor extends Actor {
  constructor() {
    super();
    this.counter = document.getElementById("counter");
  }
  onMessage(counterValue) {
    this.counter.textContent = counterValue;
  }
}

async function bootstrap() {
  await initializeQueues();

  hookup("state.update", new UIActor());
  new Worker("./counter-worker.js", { type: "module" });

  for (const button of document.getElementsByTagName("button")) {
    button.addEventListener("click", () => {
      lookup("counter").send(button.textContent);
    });
  }
}
bootstrap();
