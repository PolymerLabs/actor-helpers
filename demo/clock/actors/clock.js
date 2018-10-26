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
import { Machine } from "https://unpkg.com/xstate@3.3.3/es/index.js";

export class Clock extends Actor {
  async init() {
    this.time = 0;
    this.next = -1;
    this.machine = Machine({
      initial: "paused",
      states: {
        paused: {
          on: {
            START: "running",
            RESET: "reset"
          }
        },

        running: {
          on: {
            PAUSE: "paused",
            TICK: "tick",
            RESET: "reset"
          }
        },

        tick: {
          on: {
            RUNNING: "running"
          }
        },

        reset: {
          on: {
            PAUSE: "paused"
          }
        }
      }
    });

    this.state = this.machine.initialState;
    this.ui = lookup("ui");
    await this.notify();
  }

  onMessage(msg) {
    this.state = this.machine.transition(this.state, msg);

    switch (this.state.value) {
      case "running":
        this.setTickTimeout(1000);
        break;

      case "tick":
        this.onMessage("RUNNING");
        this.incrementTickCount();
        break;

      case "paused":
        this.cancelTickTimeout();
        break;

      case "reset":
        this.cancelTickTimeout();
        this.resetTickCount();
        this.onMessage("PAUSE");
        break;
    }

    this.notify();
  }

  setTickTimeout(time) {
    this.next = setTimeout(() => this.onMessage("TICK"), time);
  }

  cancelTickTimeout() {
    clearTimeout(this.next);
    this.next = -1;
  }

  incrementTickCount() {
    this.time++;
  }

  resetTickCount() {
    this.time = 0;
  }

  async notify() {
    await this.ui.send({
      time: this.time,
      running: this.state.value === "running"
    });
  }
}
