import {
  ClientStateMessenger,
  MasterStateMessenger
} from "../../lib/state-messenger/StateMessenger.js";

const worker = new Worker("./counter-worker.js", { type: "module" });
const counter = document.getElementById("counter");
const counterStateMessenger = ClientStateMessenger.create("counter");
const actionStateMessenger = MasterStateMessenger.create("action");

counterStateMessenger.listen(newValue => {
  counter.textContent = newValue;
});
counterStateMessenger.start();

for (const button of document.getElementsByTagName("button")) {
  button.addEventListener("click", () => {
    actionStateMessenger.setState(button.textContent);
  });
}
actionStateMessenger.start();
