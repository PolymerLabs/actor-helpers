import { Actor, hookup, lookup } from "../../lib/actor/Actor.js";

const worker = new Worker("./counter-worker.js", { type: "module" });
const counter = document.getElementById("counter");

class UIActor extends Actor {
  onMessage(counterValue) {
    counter.textContent = counterValue;
  }
}

hookup("state.update", new UIActor());

for (const button of document.getElementsByTagName("button")) {
  button.addEventListener("click", async () => {
    (await lookup("counter")).send(button.textContent);
  });
}
