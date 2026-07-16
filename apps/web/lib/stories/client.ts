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
1. **Target Word Integration**: The target word must be a central element of the story. Repeat the target word and other words from the same phonics category where appropriate, but ensure the story remains natural and fun.
2. **Reading Level**: Keep sentences short and simple. Use vocabulary suitable for beginning readers aged 4 to 6 years old (kindergarten to early elementary).
3. **Structure**: The story should have a clear beginning, middle, and end.
4. **Theme Alignment**: If a theme is provided, weave the story around that theme (e.g., space adventure, animals, fairy tales).
5. **Length**: The story should be around 100-200 words, split into 3-5 readable paragraphs.
6. **No Spoilers**: Do not explain the phonics rule within the story itself. The story should just be a fun reading practice.

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
  knownWords = []
}: {
  apiKey: string;
  word: string;
  phonicsCategory: string;
  theme?: string;
  knownWords?: string[];
}): Promise<StoryModelResponse> {
  const anthropic = new Anthropic({
    apiKey,
    timeout: STORY_TIMEOUT_MS,
    maxRetries: 0
  });

  const promptText = `Generate a story with the following requirements:
- Target Word: "${word}"
- Phonics Category: "${phonicsCategory}"
- Theme: "${theme || "General Adventure"}"
${knownWords.length > 0 ? `- Familiar/Known Words to include if possible: ${knownWords.join(", ")}` : ""}`;

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
