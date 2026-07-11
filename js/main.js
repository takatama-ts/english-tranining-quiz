import { state } from "./state.js";
import * as setupScreen from "./screens/setup.js";
import * as topicScreen from "./screens/topic.js";
import * as answerScreen from "./screens/answer.js";
import * as resultScreen from "./screens/result.js";

const screens = {
  setup: setupScreen,
  topic: topicScreen,
  answer: answerScreen,
  result: resultScreen,
};

const root = document.getElementById("app");
let currentCleanup = null;

function goTo(name) {
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }
  state.screen = name;
  window.scrollTo(0, 0);
  const cleanup = screens[name].render(root, goTo);
  if (typeof cleanup === "function") currentCleanup = cleanup;
}

goTo(state.screen);
