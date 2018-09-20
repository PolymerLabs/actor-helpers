import {
  ClientStateMessenger,
  MasterStateMessenger
} from "../../lib/state-messenger/StateMessenger.js";

import { createStore } from "./node_modules/redux/es-browser/redux.js";

const modifiersStateMessenger = MasterStateMessenger.create("modifiers");
const actionStateMessenger = ClientStateMessenger.create("action");

const initialState = {
  breakCount: 5,
  sessionCount: 25
};

const store = createStore((state = initialState, action) => {
  switch (action.type) {
    case "ADD_BREAK_LENGTH":
      return {
        ...state,
        breakCount: state.breakCount + 1
      };
    case "SUBTRACT_BREAK_LENGTH":
      return {
        ...state,
        breakCount: state.breakCount - 1
      };
    case "ADD_SESSION_LENGTH":
      return {
        ...state,
        sessionCount: state.sessionCount + 1
      };
    case "SUBTRACT_SESSION_LENGTH":
      return {
        ...state,
        sessionCount: state.sessionCount - 1
      };
    default:
      return state;
  }
});

actionStateMessenger.listen(action => {
  store.dispatch(action);
});

store.subscribe(() => {
  modifiersStateMessenger.setState(store.getState());
});

actionStateMessenger.start();
modifiersStateMessenger.start();
