import { z } from "zod";

export type PracticeErrorCode =
  | "configuration_error"
  | "word_missing"
  | "audio_missing"
  | "audio_empty"
  | "audio_too_large"
  | "invalid_audio_type"
  | "unauthorized"
  | "forbidden"
  | "internal_error";

export type PracticeErrorBody = {
  error: {
    code: PracticeErrorCode;
    message: string;
  };
};

// Shape returned directly by the ml-service's /detect-miscue endpoint (see
// services/wav2vec_service.py detect_miscue()).
export const mlPronunciationResponseSchema = z.object({
  phonemes: z.array(z.string()),
  similarity: z.number(),
  confidence: z.boolean()
});

export type MlPronunciationResponse = z.infer<typeof mlPronunciationResponseSchema>;

// Shape this Next.js route returns to the client -- renamed fields so the
// frontend doesn't need to know that "confidence" is the pass/fail signal.
export const pronunciationCheckResponseSchema = z.object({
  correct: z.boolean(),
  similarity: z.number(),
  phonemes: z.array(z.string())
});

export type PronunciationCheckResponse = z.infer<typeof pronunciationCheckResponseSchema>;