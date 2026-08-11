import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import {
  parseStoryModelResponse,
  type StoryErrorCode,
  type StoryModelResponse
} from "./schema";

const STORY_MODEL = "claude-sonnet-4-6";
const STORY_TIMEOUT_MS = 60_000;

const STORY_SYSTEM_PROMPT = `You are a creative children's book author and phonics education expert.

Your task is to generate an engaging, educational story for a child learning to read. The story must focus on a target word and its associated phonics category.

Rules for Story Generation:
1. **Vocabulary Restriction**: Use ONLY words from the Known Words list provided in the prompt, plus the target word itself. This is a hard constraint, not a suggestion -- do not use any other word, even ordinary, simple, or common ones (e.g. "home," "friend," "looked"), unless it appears in that list or is the target word. If you need a concept the list doesn't cover, rephrase the sentence using words that are on the list rather than reaching for a word that isn't. This applies even to words that appear elsewhere in this prompt, such as the theme label -- e.g. if the theme is "Ocean Adventure," the words "ocean" and "adventure" are NOT automatically allowed; they may only appear in the story if they are also in the Known Words list.
2. **Target Word Integration**: The target word must be a central element of the story. Repeat the target word where appropriate, but ensure the story remains natural and fun -- and still follows Rule 1 for every other word.
3. **Reading Level**: Keep sentences short and simple. Use vocabulary suitable for beginning readers aged 4 to 6 years old (kindergarten to early elementary).
4. **Structure**: The story should have a clear beginning, middle, and end.
5. **Theme Alignment**: If a theme is provided, use it only as loose inspiration for the situation or setting -- convey it through simple sentence structure and the words already available to you, using only words from the Known Words list (see Rule 1; the theme's own wording is not exempt from that list).
6. **Length**: The story should be around 100-200 words, split into 3-5 readable paragraphs.
7. **No Spoilers**: Do not explain the phonics rule within the story itself. The story should just be a fun reading practice.
8. **Illustration Marker**: Insert the exact marker [VISUAL] exactly once, on its own, at the single best point in the story for an illustration (for example, between two paragraphs, at the story's most exciting moment). This marker will be replaced with an image and is never shown to the reader as text, so do not describe it or refer to it in the story itself.
9. **Ending**: End the story on a clearly positive, upbeat note (e.g. an exclamation, or a word like "happy," "smiled," or "yay" -- if one of those is in the Known Words list).

Validation Criteria:
Evaluate the generated story and calculate a validation score from 0 to 100:
- High Score (90-100): Excellent integration of the target word, correct reading level, highly engaging, and strictly follows the theme.
- Medium Score (70-80): Good integration but could be more repetitive or engaging.
- Low Score (<70): Poor integration of the target word or incorrect reading level.

Return ONLY this JSON format:
{
  "story_text": "...",
  "validation_score": 95
}`;

// Used only when the strict, known-words-locked generation above has
// exhausted its attempts (see FALLBACK_SYSTEM_PROMPT usage in
// generateFallbackStory below). This drops the fixed-vocabulary
// constraint -- which is the constraint that was failing -- in favor of
// "keep it simple" as a general instruction, so it still produces a real,
// coherent short story instead of a rigid word-substitution template.
const FALLBACK_SYSTEM_PROMPT = `You are a creative children's book author and phonics education expert.

Your task is to generate a VERY SHORT, simple story for a beginning reader (kindergarten to early elementary, ages 4-6), built around a single target word. This is a fallback for when we don't have a reliable vocabulary list for this child yet, so unlike a normal request, you do NOT get a fixed list of allowed words -- instead, follow these rules:

1. **Extremely simple vocabulary**: Use only common, everyday English words a beginning reader would recognize (short, high-frequency words). Avoid anything advanced, rare, or abstract.
2. **Target Word Integration**: The target word must appear naturally at least twice.
3. **Very short**: 30-60 words total, 2-3 short paragraphs. Shorter is better than longer here.
4. **Structure**: A tiny beginning-middle-end, even if simple (e.g. "X sees the [word]. X likes the [word]. X is happy.").
5. **Illustration Marker**: Insert the exact marker [VISUAL] exactly once, on its own line, at the best point for an illustration.
6. **Ending**: End on a clearly positive, upbeat note.
7. **No Spoilers**: Do not explain the phonics rule within the story itself.

Return ONLY this JSON format:
{
  "story_text": "...",
  "validation_score": 70
}`;

export class StoryMalformedResponseError extends Error {
  constructor(message = "Claude returned malformed Story JSON.") {
    super(message);
    this.name = "StoryMalformedResponseError";
  }
}

export type StableStoryUpstreamError = {
  code: StoryErrorCode;
  message: string;
  status: number;
};

export async function generateStoryWithClaude({
  apiKey,
  word,
  phonicsCategory,
  theme,
  knownWords = [],
  phonicsGrounding,
  feedback
}: {
  apiKey: string;
  word: string;
  phonicsCategory: string;
  theme?: string;
  knownWords?: string[];
  phonicsGrounding?: { ruleExplanation: string; examples: string[] } | null;
  feedback?: string[];
}): Promise<StoryModelResponse> {
  const anthropic = new Anthropic({
    apiKey,
    timeout: STORY_TIMEOUT_MS,
    maxRetries: 0
  });

  const feedbackLine =
    feedback && feedback.length > 0
      ? `Your previous attempt FAILED these checks -- fix every one of them this time:\n${feedback.map((line) => `- ${line}`).join("\n")}`
      : "";

  const groundingLine = phonicsGrounding
  ? `Phonics focus for this word: ${phonicsGrounding.ruleExplanation}${
      phonicsGrounding.examples.length > 0
        ? ` Related words for this pattern you may use: ${phonicsGrounding.examples.join(", ")}.`
        : ""
    }`
  : "";

  // No default of "General Adventure" here anymore: that string was
  // silently injecting "adventure" into the model's context as if it were
  // sanctioned vocabulary, and Claude would frequently echo it straight
  // into the story text -- which then failed the vocabulary guardrail,
  // since "adventure" is very unlikely to be in a beginner's known-words
  // list. When there's no explicit theme, just tell Claude to pick freely
  // from the allowed words instead of handing it an ungrounded noun.
  const themeLine = theme
    ? `- Theme: "${theme}" (inspiration only -- every word you use must still come from the Known Words list per Rule 1, including words from this theme label itself)`
    : `- Theme: none specified -- write any simple, everyday scene using only the Known Words list`;

const promptText = [
  `Generate a story with the following requirements:`,
  `- Target Word: "${word}"`,
  `- Phonics Category: "${phonicsCategory}"`,
  themeLine,
  knownWords.length > 0
    ? `- Known Words list (the ONLY words you may use besides the target word): ${knownWords.join(", ")}`
    : "",
  groundingLine,
  feedbackLine
]
  .filter(Boolean)
  .join("\n");

  const response = await anthropic.messages.create(
    {
      model: STORY_MODEL,
      max_tokens: 2000,
      system: [
        {
          type: "text",
          text: STORY_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" }
        }
      ],
      messages: [
        {
          role: "user",
          content: promptText
        }
      ]
    },
    {
      headers: {
        "anthropic-beta": "prompt-caching-2024-07-31"
      },
      timeout: STORY_TIMEOUT_MS,
      maxRetries: 0,
      signal: AbortSignal.timeout(STORY_TIMEOUT_MS)
    }
  );

  const textBlock = response.content.find((block) => block.type === "text");

  if (!textBlock || textBlock.type !== "text") {
    throw new StoryMalformedResponseError("Claude did not return a text content block.");
  }

  const parsed = parseStoryModelResponse(textBlock.text);


  if (!parsed.success) {
    throw new StoryMalformedResponseError("Claude Story JSON failed validation.");
  }

  return parsed.data;
}

// Fallback generator: same idea as generateStoryWithClaude, but without a
// fixed Known Words list to lock onto (that constraint is exactly what
// was failing after 3 real attempts) and asking for something much
// shorter. Still real, Claude-generated prose -- not a hand-written
// template -- just with "keep it very simple" as the only vocabulary
// instruction instead of an exact allow-list.
export async function generateFallbackStory({
  apiKey,
  word,
  phonicsCategory,
  phonicsGrounding
}: {
  apiKey: string;
  word: string;
  phonicsCategory: string;
  phonicsGrounding?: { ruleExplanation: string; examples: string[] } | null;
}): Promise<StoryModelResponse> {
  const anthropic = new Anthropic({
    apiKey,
    timeout: STORY_TIMEOUT_MS,
    maxRetries: 0
  });

  const groundingLine = phonicsGrounding
    ? `Phonics focus for this word: ${phonicsGrounding.ruleExplanation}`
    : "";

  const promptText = [
    `Generate a very short fallback story with the following requirements:`,
    `- Target Word: "${word}"`,
    `- Phonics Category: "${phonicsCategory}"`,
    groundingLine
  ]
    .filter(Boolean)
    .join("\n");

  const response = await anthropic.messages.create(
    {
      model: STORY_MODEL,
      max_tokens: 800,
      system: [
        {
          type: "text",
          text: FALLBACK_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" }
        }
      ],
      messages: [
        {
          role: "user",
          content: promptText
        }
      ]
    },
    {
      headers: {
        "anthropic-beta": "prompt-caching-2024-07-31"
      },
      timeout: STORY_TIMEOUT_MS,
      maxRetries: 0,
      signal: AbortSignal.timeout(STORY_TIMEOUT_MS)
    }
  );

  const textBlock = response.content.find((block) => block.type === "text");

  if (!textBlock || textBlock.type !== "text") {
    throw new StoryMalformedResponseError("Claude did not return a text content block.");
  }

  const parsed = parseStoryModelResponse(textBlock.text);

  if (!parsed.success) {
    throw new StoryMalformedResponseError("Claude fallback Story JSON failed validation.");
  }

  return parsed.data;
}

export function mapStoryUpstreamError(error: unknown): StableStoryUpstreamError {
  if (error instanceof StoryMalformedResponseError) {
    return {
      code: "story_malformed_response",
      message: "We could not generate a proper story. Please try again.",
      status: 502
    };
  }

  if (error instanceof Anthropic.APIConnectionTimeoutError || isAbortError(error)) {
    return {
      code: "story_timeout",
      message: "Story generation took too long. Please try again.",
      status: 504
    };
  }

  if (error instanceof Anthropic.APIError) {
    if (error.status === 401 || error.status === 403 || error.type === "authentication_error") {
      return {
        code: "configuration_error",
        message: "Story generation service is not configured correctly.",
        status: 502
      };
    }

    if (error.status === 429 || error.type === "rate_limit_error") {
      return {
        code: "story_upstream_error",
        message: "Story generation is busy right now. Please try again soon.",
        status: 503
      };
    }

    return {
      code: "story_upstream_error",
      message: "Story generation is unavailable right now. Please try again.",
      status: 502
    };
  }

  return {
    code: "internal_error",
    message: "Something went wrong while generating the story.",
    status: 500
  };
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}