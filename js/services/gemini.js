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
        },
        required: ["category", "hint"],
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

export async function generateTopics(apiKey, { mode, purpose, specifyTopic }, count = 5) {
  let instruction;
  if (mode === "specify") {
    instruction = `Return exactly 1 topic: category="${specifyTopic}". Provide a short one-line English hint clarifying the scope of that category.`;
    count = 1;
  } else if (mode === "auto") {
    instruction = purpose
      ? `Generate ${count} distinct, varied vocabulary-category topics suited to an English learner whose goal is: "${purpose}". Mix general everyday categories with a few relevant to that goal.`
      : `Generate ${count} distinct, varied everyday vocabulary-category topics for an English learner.`;
  } else {
    instruction = `Generate ${count} distinct, varied vocabulary-category topics spanning different domains (nature, daily life, work, travel, food, etc.) for an English learner. Surprise the learner with variety.`;
  }

  const prompt = `You are generating topics for a category-fluency English vocabulary game, similar to the "name 10 flowers in 30 seconds" exercise used for cognitive/language fluency training. The player must list as many English words belonging to one category as possible within a time limit. ${instruction}
Each topic's category should be a short noun phrase (e.g. "Fruits", "Kitchen utensils", "Things found in an office"), broad enough to have at least 15 valid English words, and its hint should be a one-line clarification in English of what counts.
Respond only with JSON matching the schema.`;

  const result = await callGemini(apiKey, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    responseSchema: TOPICS_SCHEMA,
  });
  return result.topics;
}

export async function gradeWriting(apiKey, { category, hint, words }) {
  const prompt = `You are grading a category-fluency English vocabulary exercise. The category is "${category}" (${hint}).
The player listed the following words, separated by commas, within a time limit:
${words.join(", ")}

For each distinct word:
- It counts as valid if it is a real English word (or common English phrase) that genuinely belongs to the category.
- Ignore casing and minor typos when clearly recognizable, but correct them in the output word.
- Treat duplicates as a single entry.
- If invalid, briefly explain why in Japanese (e.g. "カテゴリに合わない", "英単語として認識できません").

Then give a short, encouraging feedback comment in Japanese (2-3 sentences) about their performance, mentioning the count of valid words and one concrete tip for expanding vocabulary in this category.
Respond only with JSON matching the schema. "score" should equal the number of valid words.`;

  return callGemini(apiKey, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    responseSchema: GRADE_SCHEMA,
  });
}

export async function gradeSpeaking(apiKey, { category, hint, audioBase64, mimeType }) {
  const prompt = `You are grading a category-fluency English vocabulary exercise. The category is "${category}" (${hint}).
The attached audio is the player speaking as many English words belonging to this category as possible within a time limit.

First transcribe what the player said (as plain English text, "transcript" field).
Then extract each distinct word/short phrase they said that is intended to belong to the category:
- It counts as valid if it is a real, recognizable English word or common phrase that genuinely belongs to the category, even if pronunciation was imperfect but recognizable.
- Treat duplicates as a single entry.
- If invalid (not a real word, not in the category, or unintelligible), briefly explain why in Japanese.

Then give a short, encouraging feedback comment in Japanese (2-3 sentences) about their performance and pronunciation, mentioning the count of valid words and one concrete tip.
Respond only with JSON matching the schema. "score" should equal the number of valid words.`;

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
