import { createStore } from "./redux.mjs";
import { EventChannel } from "../../lib/event-channel/EventChannel.js";

const channel = new EventChannel();
const initialState = {
  breakCount: 5,
  sessionCount: 25,
  isRunning: false,
  secondsLeft: 25 * 60,
  inSession: true
};

let intervalId;

const store = createStore((state = initialState, { type }) => {
  switch (type) {
    case "SUBTRACT_BREAK_LENGTH":
      return {
        ...state,
        breakCount: state.breakCount - 1
      };
    case "ADD_BREAK_LENGTH":
      return {
        ...state,
        breakCount: state.breakCount + 1
      };
    case "SUBTRACT_SESSION_LENGTH":
      return {
        ...state,
        sessionCount: state.sessionCount - 1,
        secondsLeft: state.isRunning
          ? state.secondsLeft
          : state.sessionCount * 60
      };
    case "ADD_SESSION_LENGTH":
      return {
        ...state,
        sessionCount: state.sessionCount + 1,
        secondsLeft: state.isRunning
          ? state.secondsLeft
          : state.sessionCount * 60
      };
    case "TIMER_ACTION":
      const isRunning = !state.isRunning;

      if (isRunning) {
        intervalId = setInterval(() => {
          store.dispatch({ type: "TIMER_REDUCE" });
          channel.dispatch("state.update", store.getState());
        }, 10);
      } else {
        clearInterval(intervalId);
      }

      return {
        ...state,
        isRunning
      };
    case "TIMER_REDUCE":
      let secondsLeft = state.secondsLeft - 1;
      let inSession = state.inSession;

      if (secondsLeft < 0) {
        inSession = !state.inSession;
        secondsLeft = (inSession ? state.sessionCount : state.breakCount) * 60;
      }

      return {
        ...state,
        secondsLeft,
        inSession
      };
    case "TIMER_RESET":
      clearInterval(intervalId);
      return {
        ...state,
        isRunning: false,
        secondsLeft: state.sessionCount * 60
      };
    default:
      return state;
  }
});

channel.exposeFunction("state.action", "state.update", action => {
  store.dispatch({ type: action });
  return store.getState();
});
