import { state, resetAnswer } from "../state.js";

export function render(root, goTo) {
  const tpl = document.getElementById("tpl-result");
  root.replaceChildren(tpl.content.cloneNode(true));

  const scoreNumberEl = root.querySelector("#score-number");
  const transcriptBlock = root.querySelector("#transcript-block");
  const transcriptText = root.querySelector("#transcript-text");
  const audioEl = root.querySelector("#answer-audio");
  const validListEl = root.querySelector("#valid-words");
  const invalidListEl = root.querySelector("#invalid-words");
  const feedbackText = root.querySelector("#feedback-text");
  const feedbackTextEn = root.querySelector("#feedback-text-en");
  const retryBtn = root.querySelector("#retry-btn");
  const settingsBtn = root.querySelector("#settings-btn");

  const result = state.result || { validWords: [], invalidWords: [], score: 0, feedback: "" };

  scoreNumberEl.textContent = result.score ?? result.validWords.length;

  result.validWords.forEach((word) => {
    const li = document.createElement("li");
    li.textContent = word;
    validListEl.appendChild(li);
  });
  if (result.validWords.length === 0) {
    const li = document.createElement("li");
    li.textContent = "なし";
    li.style.background = "transparent";
    li.style.color = "inherit";
    li.style.opacity = "0.6";
    validListEl.appendChild(li);
  }

  if (result.invalidWords.length === 0) {
    const li = document.createElement("li");
    li.textContent = "なし";
    li.style.background = "transparent";
    li.style.color = "inherit";
    li.style.opacity = "0.6";
    invalidListEl.appendChild(li);
  } else {
    result.invalidWords.forEach(({ word, reason }) => {
      const li = document.createElement("li");
      li.textContent = word;
      const reasonEl = document.createElement("span");
      reasonEl.className = "reason";
      reasonEl.textContent = reason;
      li.appendChild(reasonEl);
      invalidListEl.appendChild(li);
    });
  }

  feedbackText.textContent = result.feedback || "";
  feedbackTextEn.textContent = result.feedbackEn || "";

  if (state.settings.inputMode === "speaking") {
    transcriptBlock.hidden = false;
    transcriptText.textContent = result.transcript || "";
    if (state.answer.audioUrl) {
      audioEl.hidden = false;
      audioEl.src = state.answer.audioUrl;
    }
  }

  retryBtn.addEventListener("click", () => {
    state.result = null;
    resetAnswer();
    goTo("topic");
  });

  settingsBtn.addEventListener("click", () => {
    state.result = null;
    state.topicQueue = null;
    state.currentTopic = null;
    resetAnswer();
    goTo("setup");
  });
}
