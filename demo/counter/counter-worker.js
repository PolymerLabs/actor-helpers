import { EventChannel } from "../../lib/event-channel/EventChannel.js";

const channel = new EventChannel({ channel: "counter" });

let counter = 0;

channel.exposeFunction("state.action", "state.update", action => {
  if (action === "++") {
    counter++;
  } else if (action === "--") {
    counter--;
  } else {
    throw new Error(`Received invalid counter action: ${action}`);
  }

  return counter;
});
