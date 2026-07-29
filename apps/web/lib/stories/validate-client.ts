import "server-only";

import {
  validateStoryResponseSchema,
  type StoryErrorCode,
  type ValidateStoryResponse
} from "./schema";

const DEFAULT_ML_SERVICE_URL = "http://localhost:8000";

// ticket: implement /api/stories/generate orchestration (known-words -> sonnet -> validate -> image -> store)
export class StoryValidationUpstreamError extends Error {
  code: StoryErrorCode;
  status: number;

  constructor(code: StoryErrorCode, message: string, status: number) {
    super(message);
    this.name = "StoryValidationUpstreamError";
    this.code = code;
    this.status = status;
  }
}

export async function validateStoryWithGuardrails({
  storyText,
  childId,
  word,
  knownWords
}: {
  storyText: string;
  childId: string;
  word: string;
  knownWords: string[];
}): Promise<ValidateStoryResponse> {
  const baseUrl = process.env.ML_SERVICE_URL || DEFAULT_ML_SERVICE_URL;
  const serviceKey = process.env.ML_SERVICE_KEY;

  if (!serviceKey) {
    throw new StoryValidationUpstreamError(
      "configuration_error",
      "ML service authentication key is not configured.",
      500
    );
  }

  const endpoint = `${baseUrl}/validate-story`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": serviceKey
      },
      body: JSON.stringify({
        story_text: storyText,
        child_id: childId,
        word,
        known_words: knownWords
      })
    });
  } catch (error) {
    console.error("Failed to connect to ML service for story validation.", error);
    throw new StoryValidationUpstreamError(
      "story_upstream_error",
      "Unable to connect to the story validation service.",
      502
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new StoryValidationUpstreamError(
      "configuration_error",
      "Unauthorized access to story validation service.",
      500
    );
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message = errorBody?.detail?.message || errorBody?.detail || "Story validation service returned an error.";
    throw new StoryValidationUpstreamError("story_upstream_error", message, 502);
  }

  const data = await response.json().catch(() => null);

  const parsed = validateStoryResponseSchema.safeParse(data);
  if (!parsed.success) {
    console.error("Story validation response failed schema validation.", parsed.error);
    throw new StoryValidationUpstreamError(
      "story_upstream_error",
      "Story validation service returned a malformed response.",
      502
    );
  }

  return parsed.data;
}
