import { MasterStateMessenger } from "../../state-messenger/StateMessenger.js";

const state = {
  foo: "",
  bar: { baz: 5 }
};
const newState = {
  foo: "Updated",
  bar: { baz: 6 }
};

let master: MasterStateMessenger<{}>;

onmessage = ({ data }) => {
  if (data === "create") {
    master = MasterStateMessenger.create("channel", state);
    master.start();
  } else if (data === "setState") {
    master.setState(newState);
  }
};
