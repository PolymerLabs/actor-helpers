import { MessageBus } from "../../lib/message-bus/MessageBus.js";
import { Actor, hookup } from "../../lib/actor/Actor.js";

const messageBus = MessageBus.create({ channel: "counter" });

class CounterActor extends Actor {
  constructor() {
    super();
    this.counter = 0;
  }
  init() {}
  onMessage(action) {
    if (action === "++") {
      this.counter++;
    } else if (action === "--") {
      this.counter--;
    } else {
      throw new Error(`Received invalid counter action: ${action}`);
    }

    messageBus.dispatchEvent("state.update", this.counter);
  }
}

hookup(messageBus, new CounterActor(), "counter");
