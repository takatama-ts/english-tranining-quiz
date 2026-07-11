const KEYS = {
  apiKey: "wordsprint.apiKey",
  settings: "wordsprint.settings",
};

export function loadApiKey() {
  return localStorage.getItem(KEYS.apiKey) || "";
}

export function saveApiKey(apiKey) {
  localStorage.setItem(KEYS.apiKey, apiKey);
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEYS.settings);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSettings(settings) {
  localStorage.setItem(KEYS.settings, JSON.stringify(settings));
}
