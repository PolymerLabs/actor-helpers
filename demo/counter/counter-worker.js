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
    // TODO(tvanderlippe): Remove this once the initialState for the master is optional.
  } else if (action) {
    throw new Error(`Received invalid counter action: ${action}`);
  }

  counterStateMessenger.setState(counter);
});

actionStateMessenger.start();
counterStateMessenger.start();
