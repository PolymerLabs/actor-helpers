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
