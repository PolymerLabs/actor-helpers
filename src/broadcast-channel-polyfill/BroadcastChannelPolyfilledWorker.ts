import { BroadcastChannelPolyfill } from "./BroadcastChannelPolyfill.js";

onmessage = () => {
  const channel = new BroadcastChannelPolyfill("channel");

  channel.addEventListener("message", ({ data }) => {
    if (data === "main-thread-message") {
      channel.postMessage("worker-message");
    }
  });

  postMessage("started");
};
