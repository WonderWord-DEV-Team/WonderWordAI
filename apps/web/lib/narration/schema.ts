import { z } from "zod";

export const DEFAULT_STORY_NARRATION_BUCKET = "story-narrations";
export const DEFAULT_STORY_NARRATION_SIGNED_URL_TTL_SECONDS = 3600;
export const MAX_STORY_NARRATION_TEXT_LENGTH = 20_000;
export const STORY_NARRATION_ALIGNMENT_VERSION = "whisperx-align-v1";

export type StoryNarrationErrorCode =
  | "unauthorized"
  | "forbidden"
  | "story_not_found"
  | "validation_error"
  | "configuration_error"
  | "narration_timeout"
  | "narration_unavailable"
  | "malformed_narration_response"
  | "storage_failed"
  | "persistence_failed"
  | "internal_error";

export type StoryNarrationErrorBody = {
  error: {
    code: StoryNarrationErrorCode;
    message: string;
  };
};

const finiteSecondsSchema = z.number().finite().nonnegative();

export const storyNarrationWordSchema = z
  .object({
    word: z.string().trim().min(1),
    start: finiteSecondsSchema,
    end: finiteSecondsSchema
  })
  .strict()
  .superRefine((word, context) => {
    if (word.end <= word.start) {
      context.addIssue({
        code: "custom",
        message: "Word end must be greater than start.",
        path: ["end"]
      });
    }
  });

export const storyNarrationWordsSchema = z
  .array(storyNarrationWordSchema)
  .min(1)
  .superRefine((words, context) => {
    words.forEach((word, index) => {
      const previous = words[index - 1];

      if (previous && word.start < previous.start) {
        context.addIssue({
          code: "custom",
          message: "Narration word timestamps must be chronological.",
          path: [index, "start"]
        });
      }
    });
  });

export const storyNarrationDataSchema = z
  .object({
    storyId: z.string().uuid(),
    audioUrl: z.string().url(),
    mimeType: z.string().trim().min(1),
    duration: z.number().finite().positive(),
    words: storyNarrationWordsSchema,
    expiresAt: z.string().datetime()
  })
  .strict()
  .superRefine((data, context) => {
    const finalWord = data.words[data.words.length - 1];

    if (finalWord && data.duration < finalWord.end) {
      context.addIssue({
        code: "custom",
        message: "Narration duration must be at least the final word end.",
        path: ["duration"]
      });
    }
  });

export const storyNarrationResponseSchema = z
  .object({
    data: storyNarrationDataSchema
  })
  .strict();

export const mlNarrationResponseSchema = z
  .object({
    audio_base64: z.string().min(1),
    mime_type: z.string().trim().min(1),
    duration: z.number().finite().positive(),
    words: storyNarrationWordsSchema
  })
  .strict()
  .superRefine((data, context) => {
    const finalWord = data.words[data.words.length - 1];

    if (finalWord && data.duration < finalWord.end) {
      context.addIssue({
        code: "custom",
        message: "ML narration duration must be at least the final word end.",
        path: ["duration"]
      });
    }
  });

export const SUPPORTED_NARRATION_MIME_TYPES = [
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/wav"
] as const;

export type SupportedNarrationMimeType = (typeof SUPPORTED_NARRATION_MIME_TYPES)[number];
export type NarrationWord = z.infer<typeof storyNarrationWordSchema>;
export type StoryNarration = z.infer<typeof storyNarrationDataSchema>;
export type StoryNarrationResponse = z.infer<typeof storyNarrationResponseSchema>;
export type MlNarrationResponse = z.infer<typeof mlNarrationResponseSchema>;

export function isSupportedNarrationMimeType(type: string): type is SupportedNarrationMimeType {
  return SUPPORTED_NARRATION_MIME_TYPES.includes(type.trim().toLowerCase() as SupportedNarrationMimeType);
}

export function getNarrationFileExtension(mimeType: SupportedNarrationMimeType) {
  switch (mimeType) {
    case "audio/mpeg":
      return "mp3";
    case "audio/mp4":
      return "m4a";
    case "audio/ogg":
      return "ogg";
    case "audio/wav":
      return "wav";
  }
}
