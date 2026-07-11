import { loadApiKey, loadSettings } from "./services/storage.js";

const savedSettings = loadSettings();

export const state = {
  screen: "setup",
  apiKey: loadApiKey(),
  settings: {
    questionMode: "auto", // 'specify' | 'auto' | 'full-auto'
    specifyTopic: "",
    purpose: "",
    inputMode: "speaking", // 'speaking' | 'writing'
    timeLimitSec: 30,
    ...savedSettings,
  },
  topicQueue: null, // TopicQueue instance, created when entering topic screen
  currentTopic: null, // { category, hint }
  answer: {
    words: [],
    rawText: "",
    audioBlob: null,
    audioUrl: null,
    audioBase64: null,
    audioMimeType: null,
    elapsedSec: 0,
  },
  result: null, // { validWords, invalidWords, score, feedback, transcript? }
};

export function resetAnswer() {
  if (state.answer.audioUrl) {
    URL.revokeObjectURL(state.answer.audioUrl);
  }
  state.answer = {
    words: [],
    rawText: "",
    audioBlob: null,
    audioUrl: null,
    audioBase64: null,
    audioMimeType: null,
    elapsedSec: 0,
  };
}
