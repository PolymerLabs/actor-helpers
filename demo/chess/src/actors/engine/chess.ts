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

declare global {
  interface ActorMessageType {
    engine: {};
  }
}

import { Actor, lookup } from "westend-helpers/src/actor/Actor.js";
import {
  FormatMove,
  g_inCheck,
  GetFen,
  GetMoveFromString,
  InitializeFromFen,
  MakeMove,
  PVFromHash,
  ResetGame,
  Search
} from "garbo/js/garbochess.js";

export interface ExternalState {
  fen: string;
}

export class Engine extends Actor<{}> {
  onMessage(message: {}) {}
}

console.log(ResetGame);
