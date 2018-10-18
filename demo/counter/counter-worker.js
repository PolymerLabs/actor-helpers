import { Actor, hookup, lookup } from "../../lib/actor/Actor.js";

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
