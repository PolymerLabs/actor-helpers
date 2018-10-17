import { MessageBus } from "../../lib/message-bus/MessageBus.js";
import { Actor, hookup, lookup } from "../../lib/actor/Actor.js";

const worker = new Worker("./counter-worker.js", { type: "module" });
const counter = document.getElementById("counter");
const messageBus = MessageBus.createEndpoint({ channel: "counter" });

class UIActor extends Actor {
  onMessage(counterValue) {
    counter.textContent = counterValue;
  }
}

hookup(messageBus, new UIActor(), "state.update");

for (const button of document.getElementsByTagName("button")) {
  button.addEventListener("click", async () => {
    (await lookup(messageBus, "counter")).send(button.textContent);
  });
}
