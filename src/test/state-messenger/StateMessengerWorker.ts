import { MasterStateMessenger } from "../../state-messenger/StateMessenger.js";

const initialState = {
  foo: "",
  bar: { baz: 5 }
};
const newState = {
  foo: "Updated",
  bar: { baz: 6 }
};

let master: MasterStateMessenger<"channel">;

onmessage = ({ data }) => {
  if (data === "create") {
    master = MasterStateMessenger.create("channel", { initialState });
    master.start();
  } else if (data === "setState") {
    master.setState(newState);
  }
};
