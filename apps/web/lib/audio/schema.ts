import { z } from "zod";

export const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

export const ALLOWED_AUDIO_TYPES = [
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav"
] as const;

export type AllowedAudioType = (typeof ALLOWED_AUDIO_TYPES)[number];

export type SessionAudioErrorCode =
  | "unauthorized"
  | "forbidden"
  | "session_not_found"
  | "session_closed"
  | "audio_missing"
  | "audio_empty"
  | "invalid_audio_type"
  | "audio_too_large"
  | "ml_configuration_error"
  | "transcription_timeout"
  | "transcription_unavailable"
  | "malformed_transcription_response"
  | "persistence_failed"
  | "internal_error";

const finiteTimestampSchema = z.number().finite().nonnegative();
const optionalFiniteTimestampSchema = finiteTimestampSchema.nullable().optional();

export const mlTranscribeMiscueSchema = z
  .object({
    word: z.string().trim().min(1),
    expected_phonemes: z.string(),
    actual_phonemes: z.string(),
    phonics_category: z.string().trim().min(1).optional(),
    similarity_score: z.number().finite().min(0).max(1).optional(),
    confidence: z.number().finite().min(0).max(1).optional(),
    is_correct: z.boolean().optional()
  })
  .strict();

export const mlTranscribeSegmentSchema = z
  .object({
    text: z.string(),
    start: optionalFiniteTimestampSchema,
    end: optionalFiniteTimestampSchema
  })
  .strict()
  .superRefine((segment, context) => {
    if (
      typeof segment.start === "number" &&
      typeof segment.end === "number" &&
      segment.end < segment.start
    ) {
      context.addIssue({
        code: "custom",
        message: "Segment end must be greater than or equal to start.",
        path: ["end"]
      });
    }
  });

export const mlTranscribeResultSchema = z
  .object({
    words: z.array(z.string().trim().min(1)),
    timestamps: z.array(finiteTimestampSchema),
    miscues: z.array(mlTranscribeMiscueSchema),
    transcript: z.string().optional(),
    segments: z.array(mlTranscribeSegmentSchema).optional()
  })
  .strict()
  .superRefine((payload, context) => {
    if (payload.words.length !== payload.timestamps.length) {
      context.addIssue({
        code: "custom",
        message: "Words and timestamps must have the same length.",
        path: ["timestamps"]
      });
    }

    payload.timestamps.forEach((timestamp, index) => {
      const previousTimestamp = payload.timestamps[index - 1];

      if (typeof previousTimestamp === "number" && timestamp < previousTimestamp) {
        context.addIssue({
          code: "custom",
          message: "Word timestamps must be chronological.",
          path: ["timestamps", index]
        });
      }
    });

    payload.segments?.forEach((segment, index) => {
      const previousSegment = payload.segments?.[index - 1];

      if (
        previousSegment &&
        typeof previousSegment.end === "number" &&
        typeof segment.start === "number" &&
        segment.start < previousSegment.end
      ) {
        context.addIssue({
          code: "custom",
          message: "Segments must be chronological.",
          path: ["segments", index, "start"]
        });
      }
    });
  });

export type MlTranscribeResult = z.infer<typeof mlTranscribeResultSchema>;
export type MlTranscribeMiscue = z.infer<typeof mlTranscribeMiscueSchema>;

export const sessionAudioWordSchema = z
  .object({
    word: z.string().min(1),
    start: finiteTimestampSchema,
    end: finiteTimestampSchema.nullable()
  })
  .strict()
  .superRefine((word, context) => {
    if (word.end !== null && word.end < word.start) {
      context.addIssue({
        code: "custom",
        message: "Word end must be greater than or equal to start.",
        path: ["end"]
      });
    }
  });

export const sessionAudioMiscueSchema = z
  .object({
    word: z.string().min(1),
    expectedPhonemes: z.string(),
    actualPhonemes: z.string(),
    phonicsCategory: z.string().optional(),
    similarityScore: z.number().finite().min(0).max(1).optional(),
    confidence: z.number().finite().min(0).max(1).optional(),
    isCorrect: z.boolean().optional()
  })
  .strict();

export const sessionAudioResponseSchema = z
  .object({
    data: z
      .object({
        sessionId: z.string().uuid(),
        transcript: z.string(),
        words: z.array(sessionAudioWordSchema),
        miscues: z.array(sessionAudioMiscueSchema)
      })
      .strict()
  })
  .strict();

export type SessionAudioResponse = z.infer<typeof sessionAudioResponseSchema>;
export type SessionAudioData = SessionAudioResponse["data"];
export type SessionAudioWord = z.infer<typeof sessionAudioWordSchema>;
export type SessionAudioMiscue = z.infer<typeof sessionAudioMiscueSchema>;

export function normalizeAudioType(type: string) {
  return type.split(";")[0]?.trim().toLowerCase() ?? "";
}

export function isAllowedAudioType(type: string): type is AllowedAudioType {
  return ALLOWED_AUDIO_TYPES.includes(normalizeAudioType(type) as AllowedAudioType);
}

export function mapMlTranscriptionToSessionAudio({
  sessionId,
  result
}: {
  sessionId: string;
  result: MlTranscribeResult;
}): SessionAudioData {
  const words = result.words.map((word, index) => ({
    word,
    start: result.timestamps[index] ?? 0,
    end: null
  }));

  const miscues = result.miscues.map((miscue) => ({
    word: miscue.word,
    expectedPhonemes: miscue.expected_phonemes,
    actualPhonemes: miscue.actual_phonemes,
    phonicsCategory: miscue.phonics_category,
    similarityScore: miscue.similarity_score,
    confidence: miscue.confidence,
    isCorrect: miscue.is_correct
  }));

  return {
    sessionId,
    transcript: result.transcript?.trim() || result.words.join(" "),
    words,
    miscues
  };
}

export function getPersistableReadingEvents({
  sessionId,
  childId,
  miscues
}: {
  sessionId: string;
  childId: string;
  miscues: MlTranscribeMiscue[];
}) {
  return miscues
    .filter(
      (miscue) =>
        Boolean(miscue.word.trim()) &&
        Boolean(miscue.expected_phonemes.trim()) &&
        Boolean(miscue.actual_phonemes.trim()) &&
        Boolean(miscue.phonics_category?.trim())
    )
    .map((miscue) => ({
      session_id: sessionId,
      child_id: childId,
      word: miscue.word.trim(),
      expected_phonemes: miscue.expected_phonemes.trim(),
      actual_phonemes: miscue.actual_phonemes.trim(),
      phonics_category: miscue.phonics_category?.trim() ?? "",
      similarity_score: miscue.similarity_score ?? miscue.confidence ?? null,
      is_correct: miscue.is_correct ?? false
    }));
}
