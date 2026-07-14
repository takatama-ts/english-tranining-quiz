import { buildTopicsPrompt, buildGradeWritingPrompt, buildGradeSpeakingPrompt } from "./prompts.js";

const MODEL = "gemini-flash-latest";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export class GeminiError extends Error {}

const TOPICS_SCHEMA = {
  type: "object",
  properties: {
    topics: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string" },
          hint: { type: "string" },
          exampleWords: { type: "array", items: { type: "string" } },
        },
        required: ["category", "hint", "exampleWords"],
      },
    },
  },
  required: ["topics"],
};

const GRADE_SCHEMA = {
  type: "object",
  properties: {
    validWords: { type: "array", items: { type: "string" } },
    invalidWords: {
      type: "array",
      items: {
        type: "object",
        properties: {
          word: { type: "string" },
          reason: { type: "string" },
        },
        required: ["word", "reason"],
      },
    },
    score: { type: "integer" },
    feedback: { type: "string" },
  },
  required: ["validWords", "invalidWords", "score", "feedback"],
};

const GRADE_SPEAKING_SCHEMA = {
  type: "object",
  properties: {
    ...GRADE_SCHEMA.properties,
    transcript: { type: "string" },
  },
  required: [...GRADE_SCHEMA.required, "transcript"],
};

async function callGemini(apiKey, { contents, responseSchema }, attempt = 1) {
  if (!apiKey) {
    throw new GeminiError("Gemini APIキーが設定されていません。設定画面で入力してください。");
  }

  let response;
  try {
    response = await fetch(`${ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema,
        },
      }),
    });
  } catch (err) {
    if (attempt < 2) return callGemini(apiKey, { contents, responseSchema }, attempt + 1);
    throw new GeminiError("Gemini APIへの通信に失敗しました。ネットワーク接続を確認してください。");
  }

  if (!response.ok) {
    if (response.status === 400 || response.status === 403) {
      const body = await response.text().catch(() => "");
      if (/API key/i.test(body)) {
        throw new GeminiError("Gemini APIキーが正しくありません。設定画面で確認してください。");
      }
    }
    if (attempt < 2) return callGemini(apiKey, { contents, responseSchema }, attempt + 1);
    throw new GeminiError(`Gemini APIエラー (HTTP ${response.status})。しばらくしてから再試行してください。`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    if (attempt < 2) return callGemini(apiKey, { contents, responseSchema }, attempt + 1);
    throw new GeminiError("Geminiから有効な応答が得られませんでした。");
  }

  try {
    return JSON.parse(text);
  } catch {
    if (attempt < 2) return callGemini(apiKey, { contents, responseSchema }, attempt + 1);
    throw new GeminiError("Geminiの応答を解析できませんでした。");
  }
}

export async function generateTopics(apiKey, { mode, purpose }, count = 5) {
  const prompt = buildTopicsPrompt({ mode, purpose, count });

  const result = await callGemini(apiKey, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    responseSchema: TOPICS_SCHEMA,
  });
  return result.topics;
}

export async function gradeWriting(apiKey, { category, hint, words }) {
  const prompt = buildGradeWritingPrompt({ category, hint, words });

  return callGemini(apiKey, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    responseSchema: GRADE_SCHEMA,
  });
}

export async function gradeSpeaking(apiKey, { category, hint, audioBase64, mimeType }) {
  const prompt = buildGradeSpeakingPrompt({ category, hint });

  return callGemini(apiKey, {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }, { inlineData: { mimeType, data: audioBase64 } }],
      },
    ],
    responseSchema: GRADE_SPEAKING_SCHEMA,
  });
}
