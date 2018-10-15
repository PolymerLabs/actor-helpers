import { MessageBus } from "../../lib/message-bus/MessageBus.js";

const worker = new Worker("./counter-worker.js", { type: "module" });
const counter = document.getElementById("counter");
const messageBus = MessageBus.create({ channel: "counter" });

messageBus.addEventListener("state.update", counterValue => {
  counter.textContent = counterValue;
});

for (const button of document.getElementsByTagName("button")) {
  button.addEventListener("click", () => {
    messageBus.dispatchEvent("state.action", button.textContent);
  });
}
