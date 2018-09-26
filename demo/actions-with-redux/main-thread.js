import { EventChannel } from "../../lib/event-channel/EventChannel.js";

const worker = new Worker("./redux-worker.js", { type: "module" });
const channel = new EventChannel();

const breakCounter = document.getElementById("break-counter");
const sessionCounter = document.getElementById("session-counter");
const timerHeader = document.getElementById("timer-header");
const timerAction = document.getElementById("timer-action");
const timerReset = document.getElementById("timer-reset");
const timeLeft = document.getElementById("time-left");

channel.addEventListener("state.update", newState => {
  const {
    breakCount,
    sessionCount,
    isRunning,
    inSession,
    secondsLeft
  } = newState;

  breakCounter.textContent = breakCount;
  sessionCounter.textContent = sessionCount;

  timeLeft.textContent = `${Math.floor(secondsLeft / 60)}:${String(
    secondsLeft % 60
  ).padStart(2, "0")}`;

  timerAction.disabled = false;
  timerAction.textContent = isRunning ? "Pause" : "Start";

  timerReset.disabled = !isRunning;
  timerHeader.textContent = inSession ? "Session" : "Break";
});

for (const button of document.querySelectorAll(".modifiers button")) {
  button.addEventListener("click", () => {
    channel.dispatch("state.action", button.dataset.action);
  });
}

timerAction.addEventListener("click", () => {
  timerAction.disabled = true;
  channel.dispatch("state.action", "TIMER_ACTION");
});

timerReset.addEventListener("click", () => {
  timerReset.disabled = true;
  channel.dispatch("state.action", "TIMER_RESET");
});
