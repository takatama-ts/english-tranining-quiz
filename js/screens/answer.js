import { state } from "../state.js";
import { gradeWriting, gradeSpeaking, GeminiError } from "../services/gemini.js";
import { AudioRecorder, blobToBase64 } from "../services/audioRecorder.js";

function parseWords(text) {
  return [...new Set(text.split(",").map((w) => w.trim()).filter(Boolean))];
}

export function render(root, goTo) {
  const tpl = document.getElementById("tpl-answer");
  root.replaceChildren(tpl.content.cloneNode(true));

  const categoryEl = root.querySelector("#answer-category");
  const hintEl = root.querySelector("#answer-hint");
  const timerFill = root.querySelector("#timer-fill");
  const timerText = root.querySelector("#timer-text");
  const writingBlock = root.querySelector("#answer-writing");
  const speakingBlock = root.querySelector("#answer-speaking");
  const writingInput = root.querySelector("#writing-input");
  const wordCountEl = root.querySelector("#word-count");
  const recordBtn = root.querySelector("#record-btn");
  const recordStatus = root.querySelector("#record-status");
  const micErrorEl = root.querySelector("#mic-error");
  const errorEl = root.querySelector("#answer-error");
  const exampleWordsBlock = root.querySelector("#example-words-block");
  const exampleWordsText = root.querySelector("#example-words-text");
  const submitBtn = root.querySelector("#submit-btn");

  const topic = state.currentTopic;
  categoryEl.textContent = topic.category;
  hintEl.textContent = topic.hint || "";

  const timeLimit = state.settings.timeLimitSec;
  let remaining = timeLimit;
  timerText.textContent = remaining;

  let timerId = null;
  let finished = false;

  function stopTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function startTimer() {
    timerId = setInterval(() => {
      remaining -= 1;
      timerText.textContent = Math.max(remaining, 0);
      const pct = Math.max(0, (remaining / timeLimit) * 100);
      timerFill.style.width = `${pct}%`;
      timerFill.classList.toggle("low", remaining <= 5);
      if (remaining <= 0) {
        stopTimer();
        finalizeAndSubmit();
      }
    }, 1000);
  }

  const inputMode = state.settings.inputMode;
  let recorder = null;

  if (inputMode === "writing") {
    writingBlock.hidden = false;
    writingInput.addEventListener("input", () => {
      wordCountEl.textContent = parseWords(writingInput.value).length;
    });
  } else {
    speakingBlock.hidden = false;
    recorder = new AudioRecorder();

    recordBtn.addEventListener("click", async () => {
      micErrorEl.hidden = true;
      if (!recorder.isRecording()) {
        try {
          await recorder.start();
          recordBtn.textContent = "⏹️ 録音停止";
          recordBtn.classList.add("recording");
          recordStatus.textContent = "録音中…";
        } catch {
          micErrorEl.hidden = false;
          micErrorEl.textContent =
            "マイクを使用できません。設定でwritingモードに切り替えてください。";
        }
      } else {
        const rec = await recorder.stop();
        recordBtn.textContent = "🎙️ 録音開始";
        recordBtn.classList.remove("recording");
        recordStatus.textContent = "録音完了（送信できます / 再度押すと録り直せます）";
        applyRecording(rec);
      }
    });
  }

  function applyRecording(rec) {
    state.answer.audioBlob = rec.blob;
    state.answer.audioMimeType = rec.mimeType;
    if (state.answer.audioUrl) URL.revokeObjectURL(state.answer.audioUrl);
    state.answer.audioUrl = URL.createObjectURL(rec.blob);
  }

  function showError(msg) {
    errorEl.hidden = false;
    errorEl.textContent = msg;
  }

  const EXAMPLE_WORD_INTERVAL_MS = 3000;
  let exampleRotationId = null;

  function startExampleRotation() {
    if (!topic.exampleWords?.length) return;
    let index = 0;
    exampleWordsText.textContent = topic.exampleWords[index];
    exampleWordsBlock.hidden = false;
    exampleRotationId = setInterval(() => {
      index = (index + 1) % topic.exampleWords.length;
      exampleWordsText.textContent = topic.exampleWords[index];
    }, EXAMPLE_WORD_INTERVAL_MS);
  }

  function stopExampleRotation() {
    if (exampleRotationId) {
      clearInterval(exampleRotationId);
      exampleRotationId = null;
    }
    exampleWordsBlock.hidden = true;
  }

  function setBusy(busy) {
    submitBtn.disabled = busy;
    submitBtn.textContent = busy ? "採点中…" : "送信する";
    writingInput.disabled = busy;
    recordBtn.disabled = busy;

    if (busy) {
      startExampleRotation();
    } else {
      stopExampleRotation();
    }
  }

  async function finalizeAndSubmit() {
    if (finished) return;
    finished = true;
    stopTimer();
    errorEl.hidden = true;
    setBusy(true);

    try {
      if (inputMode === "writing") {
        const words = parseWords(writingInput.value);
        if (words.length === 0) {
          throw new Error("単語を入力してください。");
        }
        state.answer.rawText = writingInput.value;
        state.answer.words = words;
        state.result = await gradeWriting(state.apiKey, {
          category: topic.category,
          hint: topic.hint,
          words,
        });
      } else {
        if (recorder.isRecording()) {
          applyRecording(await recorder.stop());
        }
        if (!state.answer.audioBlob) {
          throw new Error("録音がありません。録音してから送信してください。");
        }
        const audioBase64 = await blobToBase64(state.answer.audioBlob);
        state.result = await gradeSpeaking(state.apiKey, {
          category: topic.category,
          hint: topic.hint,
          audioBase64,
          mimeType: state.answer.audioMimeType,
        });
      }
      goTo("result");
    } catch (err) {
      finished = false;
      setBusy(false);
      showError(
        err instanceof GeminiError || err instanceof Error ? err.message : "採点に失敗しました。"
      );
    }
  }

  submitBtn.addEventListener("click", finalizeAndSubmit);

  startTimer();

  return () => {
    stopTimer();
    stopExampleRotation();
    if (recorder && recorder.isRecording()) {
      recorder.stop();
    }
  };
}
