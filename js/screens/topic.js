import { state, resetAnswer } from "../state.js";
import { TopicQueue } from "../services/topicQueue.js";
import { GeminiError } from "../services/gemini.js";

export function render(root, goTo) {
  const tpl = document.getElementById("tpl-topic");
  root.replaceChildren(tpl.content.cloneNode(true));

  const loadingEl = root.querySelector("#topic-loading");
  const categoryEl = root.querySelector("#topic-category");
  const hintEl = root.querySelector("#topic-hint");
  const errorEl = root.querySelector("#topic-error");
  const reloadBtn = root.querySelector("#reload-btn");
  const decideBtn = root.querySelector("#decide-btn");
  const backBtn = root.querySelector("#topic-back-btn");

  backBtn.addEventListener("click", () => goTo("setup"));

  function showLoading() {
    loadingEl.hidden = false;
    categoryEl.hidden = true;
    hintEl.hidden = true;
    errorEl.hidden = true;
    decideBtn.disabled = true;
  }

  function showTopic(topic) {
    state.currentTopic = topic;
    loadingEl.hidden = true;
    errorEl.hidden = true;
    categoryEl.hidden = false;
    hintEl.hidden = Boolean(!topic.hint);
    categoryEl.textContent = topic.category;
    hintEl.textContent = topic.hint || "";
    decideBtn.disabled = false;
  }

  function showError(err) {
    loadingEl.hidden = true;
    errorEl.hidden = false;
    errorEl.textContent =
      err instanceof GeminiError ? err.message : "お題の取得に失敗しました。もう一度お試しください。";
  }

  const { questionMode, specifyTopic, purpose, timeLimitSec } = state.settings;
  void timeLimitSec;

  if (questionMode === "specify") {
    reloadBtn.hidden = true;
    showTopic({ category: specifyTopic, hint: "" });
  } else {
    reloadBtn.hidden = false;

    const isFirstLoad = !state.topicQueue;
    if (isFirstLoad) {
      state.topicQueue = new TopicQueue(state.apiKey, {
        mode: questionMode,
        purpose,
      });
    }

    showLoading();
    reloadBtn.disabled = true;

    const fetchPromise = isFirstLoad ? state.topicQueue.init() : state.topicQueue.next();
    fetchPromise
      .then((topic) => {
        showTopic(topic);
        reloadBtn.disabled = false;
      })
      .catch((err) => {
        reloadBtn.disabled = false;
        showError(err);
      });

    reloadBtn.addEventListener("click", () => {
      reloadBtn.disabled = true;
      showLoading();
      state.topicQueue
        .next()
        .then((topic) => {
          showTopic(topic);
          reloadBtn.disabled = false;
        })
        .catch((err) => {
          reloadBtn.disabled = false;
          showError(err);
        });
    });
  }

  decideBtn.addEventListener("click", () => {
    if (!state.currentTopic) return;
    state.result = null;
    resetAnswer();
    goTo("answer");
  });
}
