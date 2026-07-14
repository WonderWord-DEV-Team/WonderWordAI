import { z } from "zod";

export const transcribeMiscueSchema = z
    .object({
        word: z.string(),
        expected_phonemes: z.string(),
        actual_phonemes: z.string(),
    })
    .strict();

export const transcribeSegmentSchema = z
    .object({
        text: z.string(),
        start: z.number().nullable().optional(),
        end: z.number().nullable().optional()
    })
    .strict();

export const transcribeResultSchema = z
    .object({
        words: z.array(z.string()),
        timestamps: z.array(z.number()),
        miscues: z.array(transcribeMiscueSchema),
        transcript: z.string().optional(),
        segments: z.array(transcribeSegmentSchema).optional()
    })
    .strict();

export type TranscribeResult = z.infer<typeof transcribeResultSchema>

export const ALLOWED_AUDIO_TYPES = ["audio/webm", "audio/wav"] as const;

export type AllowedAudioType = (typeof ALLOWED_AUDIO_TYPES)[number];

export function isAllowedAudioType(type: string): type is AllowedAudioType {
        return ALLOWED_AUDIO_TYPES.includes(type as AllowedAudioType);
}

