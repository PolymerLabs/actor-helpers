import { MessageBus } from "../../lib/message-bus/MessageBus.js";

const messageBus = MessageBus.create({ channel: "counter" });

let counter = 0;

messageBus.addEventListener("state.action", (action) => {
  if (action === "++") {
    counter++;
  } else if (action === "--") {
    counter--;
  } else {
    throw new Error(`Received invalid counter action: ${action}`);
  }

  messageBus.dispatchEvent("state.update", counter);
});
