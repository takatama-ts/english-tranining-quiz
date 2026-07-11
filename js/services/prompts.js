export function buildTopicsPrompt({ mode, purpose, specifyTopic, count }) {
  let instruction;
  if (mode === "specify") {
    instruction = `Return exactly 1 topic: category="${specifyTopic}". Provide a short one-line English hint clarifying the scope of that category.`;
  } else if (mode === "auto") {
    instruction = purpose
      ? `Generate ${count} distinct, varied vocabulary-category topics suited to an English learner whose goal is: "${purpose}". Mix general everyday categories with a few relevant to that goal.`
      : `Generate ${count} distinct, varied everyday vocabulary-category topics for an English learner.`;
  } else {
    instruction = `Generate ${count} distinct, varied vocabulary-category topics spanning different domains (nature, daily life, work, travel, food, etc.) for an English learner. Surprise the learner with variety.`;
  }

  return `You are generating topics for a category-fluency English vocabulary game, similar to the "name 10 flowers in 30 seconds" exercise used for cognitive/language fluency training. The player must list as many English words belonging to one category as possible within a time limit. ${instruction}
Each topic's category should be a short noun phrase (e.g. "Fruits", "Kitchen utensils", "Things found in an office"), broad enough to have at least 15 valid English words, and its hint should be a one-line clarification in English of what counts.
Respond only with JSON matching the schema.`;
}

export function buildGradeWritingPrompt({ category, hint, words }) {
  return `You are grading a category-fluency English vocabulary exercise. The category is "${category}" (${hint}).
The player listed the following words, separated by commas, within a time limit:
${words.join(", ")}

For each distinct word:
- It counts as valid if it is a real English word (or common English phrase) that genuinely belongs to the category.
- Ignore casing and minor typos when clearly recognizable, but correct them in the output word.
- Treat duplicates as a single entry.
- If invalid, briefly explain why in Japanese (e.g. "カテゴリに合わない", "英単語として認識できません").

Then give a short, encouraging feedback comment in Japanese (2-3 sentences) about their performance, mentioning the count of valid words and one concrete tip for expanding vocabulary in this category.
Respond only with JSON matching the schema. "score" should equal the number of valid words.`;
}

export function buildGradeSpeakingPrompt({ category, hint }) {
  return `You are grading a category-fluency English vocabulary exercise. The category is "${category}" (${hint}).
The attached audio is the player speaking as many English words belonging to this category as possible within a time limit.

First transcribe what the player said (as plain English text, "transcript" field).
Then extract each distinct word/short phrase they said that is intended to belong to the category:
- It counts as valid if it is a real, recognizable English word or common phrase that genuinely belongs to the category, even if pronunciation was imperfect but recognizable.
- Treat duplicates as a single entry.
- If invalid (not a real word, not in the category, or unintelligible), briefly explain why in Japanese.

Then give a short, encouraging feedback comment in Japanese (2-3 sentences) about their performance and pronunciation, mentioning the count of valid words and one concrete tip.
Respond only with JSON matching the schema. "score" should equal the number of valid words.`;
}
