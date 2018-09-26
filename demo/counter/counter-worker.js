import { EventChannel } from "../../lib/event-channel/EventChannel.js";

const channel = new EventChannel();

let counter = 0;

channel.exposeFunction(action => {
  if (action === "++") {
    counter++;
  } else if (action === "--") {
    counter--;
  } else {
    throw new Error(`Received invalid counter action: ${action}`);
  }

  return counter;
})("state.action", "state.update");
