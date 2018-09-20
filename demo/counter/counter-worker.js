import {
  ClientStateMessenger,
  MasterStateMessenger
} from "../../lib/state-messenger/StateMessenger.js";

const counterStateMessenger = MasterStateMessenger.create("counter");
const actionStateMessenger = ClientStateMessenger.create("action");

let counter = 0;

actionStateMessenger.listen(action => {
  if (action === "++") {
    counter++;
  } else if (action === "--") {
    counter--;
  } else {
    throw new Error(`Received invalid counter action: ${action}`);
  }

  counterStateMessenger.setState(counter);
});

actionStateMessenger.start();
counterStateMessenger.start();
