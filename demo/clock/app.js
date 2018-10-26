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

import { hookup } from "../../lib/actor/Actor.js";
import { UI } from "./actors/ui.js";
import { Clock } from "./actors/clock.js";

async function bootstrap() {
  const ui = new UI();
  await hookup("ui", ui);

  // Option 1: run on the main thread.
  const clock = new Clock();
  await hookup("clock", clock);

  // Option 2: run as a worker - commented out for now.
  // new Worker("./worker.js");
}

bootstrap();
