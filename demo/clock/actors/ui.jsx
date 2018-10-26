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

import { Actor, lookup } from "../../../lib/actor/Actor.js";
import { Dial } from "../components/dial.js";
import { h, render } from "https://unpkg.com/preact@8.3.1/dist/preact.mjs";

export class UI extends Actor {
  async init() {
    this.clock = lookup("clock");
  }

  onMessage(state) {
    render(
      <div className="dial-wrapper">
        <button className="reset" onClick={ _ => this.reset() }>
          <Dial time={state.time} running={state.running}/>
        </button>
        <button className={state.running ? "running" : "paused"}
          onClick={ _ => this.toggle(state.running) }>{state.running ? "Pause" : "Start"}</button>
      </div>,
    document.body,
    document.body.firstChild);
  }

  async toggle(running) {
    await this.clock.send(running ? "PAUSE" : "START");
  }

  async reset() {
    if (!confirm("Do you wish to reset?")) {
      return;
    }

    await this.clock.send("RESET");
  }
}
