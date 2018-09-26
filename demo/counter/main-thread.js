import { EventChannel } from "../../lib/event-channel/EventChannel.js";

const worker = new Worker("./counter-worker.js", { type: "module" });
const counter = document.getElementById("counter");
const channel = new EventChannel();

channel.addEventListener("state.update", counterValue => {
  counter.textContent = counterValue;
});

for (const button of document.getElementsByTagName("button")) {
  button.addEventListener("click", () => {
    channel.dispatch("state.action", button.textContent);
  });
}
