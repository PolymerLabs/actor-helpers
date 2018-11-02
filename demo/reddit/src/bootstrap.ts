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

import { hookup } from "westend-helpers/lib/actor/Actor.js";

import { UIActor } from "./actors/ui.js";
import { AppState } from "./model/state.js";

import { RouterActor } from "./actors/router.js";

declare var Worker: {
  new (url: URL | string, options?: { type: string }): Worker;
};

declare global {
  interface ActorMessageType {
    ui: AppState;
    router: never;
  }
}

new Worker("state-worker.js", { type: "module" });

async function bootstrap() {
  hookup("ui", new UIActor());
  hookup("router", new RouterActor());
}

bootstrap();
