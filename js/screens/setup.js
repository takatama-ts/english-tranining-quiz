import { state, resetAnswer } from "../state.js";
import { saveApiKey, saveSettings } from "../services/storage.js";

export function render(root, goTo) {
  const tpl = document.getElementById("tpl-setup");
  root.replaceChildren(tpl.content.cloneNode(true));

  const apiKeyInput = root.querySelector("#api-key");
  const specifyField = root.querySelector("#specify-field");
  const specifyInput = root.querySelector("#specify-topic");
  const purposeField = root.querySelector("#purpose-field");
  const purposeInput = root.querySelector("#purpose-input");
  const purposeChips = root.querySelectorAll(".chip");
  const timeLimitInput = root.querySelector("#time-limit");
  const errorEl = root.querySelector("#setup-error");
  const startBtn = root.querySelector("#start-btn");

  apiKeyInput.value = state.apiKey;
  specifyInput.value = state.settings.specifyTopic || "";
  purposeInput.value = state.settings.purpose || "";
  timeLimitInput.value = state.settings.timeLimitSec;

  root.querySelector(
    `input[name="question-mode"][value="${state.settings.questionMode}"]`
  ).checked = true;
  root.querySelector(
    `input[name="input-mode"][value="${state.settings.inputMode}"]`
  ).checked = true;

  function updateModeVisibility() {
    const mode = root.querySelector('input[name="question-mode"]:checked').value;
    specifyField.hidden = mode !== "specify";
    purposeField.hidden = mode === "specify";
  }
  updateModeVisibility();

  root.querySelectorAll('input[name="question-mode"]').forEach((el) => {
    el.addEventListener("change", updateModeVisibility);
  });

  purposeChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      purposeInput.value = chip.dataset.value;
      purposeChips.forEach((c) => c.classList.toggle("active", c === chip));
    });
  });

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  startBtn.addEventListener("click", () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      showError("Gemini APIキーを入力してください。");
      return;
    }
    const mode = root.querySelector('input[name="question-mode"]:checked').value;
    if (mode === "specify" && !specifyInput.value.trim()) {
      showError("カテゴリを入力してください。");
      return;
    }
    const inputMode = root.querySelector('input[name="input-mode"]:checked').value;
    const timeLimitSec = Math.max(10, Math.min(180, Number(timeLimitInput.value) || 30));

    state.apiKey = apiKey;
    state.settings = {
      questionMode: mode,
      specifyTopic: specifyInput.value.trim(),
      purpose: purposeInput.value.trim(),
      inputMode,
      timeLimitSec,
    };
    saveApiKey(apiKey);
    saveSettings(state.settings);

    state.topicQueue = null;
    state.currentTopic = null;
    state.result = null;
    resetAnswer();

    goTo("topic");
  });
}
