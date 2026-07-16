import { z } from "zod";

export type StoryErrorCode =
  | "configuration_error"
  | "unauthorized"
  | "forbidden"
  | "validation_error"
  | "story_generation_failed"
  | "story_malformed_response"
  | "story_timeout"
  | "story_upstream_error"
  | "internal_error";

export type StoryErrorBody = {
  error: {
    code: StoryErrorCode;
    message: string;
  };
};

// REQUEST VALIDATION (CLIENT INPUT)
export const storyGenerationRequestSchema = z.object({
  childId: z.string().uuid("childId must be a valid UUID"),
  word: z.string().min(1, "word is required"),
  phonicsCategory: z.string().min(1, "phonicsCategory is required"),
  theme: z.string().optional()
});

export type StoryGenerationRequest = z.infer<typeof storyGenerationRequestSchema>;

// AI MODEL RESPONSE VALIDATION (AI OUTPUT)
export const storyModelResponseSchema = z.object({
  story_text: z.string().min(1, "story_text must not be empty"),
  validation_score: z.number().int().min(0).max(100)
});

export type StoryModelResponse = z.infer<typeof storyModelResponseSchema>;


// PARSING HELPER METHODS

export function extractJsonObject(rawOutput: string) {
  const trimmed = rawOutput.trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    return trimmed;
  }

  return trimmed.slice(firstBrace, lastBrace + 1);
}

export function parseStoryModelResponse(rawOutput: string) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(extractJsonObject(rawOutput));
  } catch (error) {
    return {
      success: false as const,
      error
    };
  }

  const result = storyModelResponseSchema.safeParse(parsed);

  if (!result.success) {
    return {
      success: false as const,
      error: result.error
    };
  }

  return {
    success: true as const,
    data: result.data
  };
}

