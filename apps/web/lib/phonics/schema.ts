import { z } from "zod";

export type PhonicsErrorCode =
  | "configuration_error"
  | "stuck_word_missing"
  | "unauthorized"
  | "no_rule_found"
  | "internal_error";

export type PhonicsErrorBody = {
  error: {
    code: PhonicsErrorCode;
    message: string;
  };
};

export const phonicsLookupRequestSchema = z.object({
  stuck_word: z.string().min(1, "stuck_word is required"),
  error_description: z.string().optional()
});

export type PhonicsLookupRequest = z.infer<typeof phonicsLookupRequestSchema>;

export const phonicsMatchSchema = z.object({
  id: z.string().uuid(),
  category: z.string(),
  text: z.string(),
  phonics_rule: z.string(),
  example_words: z.array(z.string()),
  similarity: z.number()
});

export type PhonicsMatch = z.infer<typeof phonicsMatchSchema>;

export const mlPhonicsResponseSchema = z.object({
  stuck_word: z.string(),
  matches: z.array(phonicsMatchSchema)
});

export type MlPhonicsResponse = z.infer<typeof mlPhonicsResponseSchema>;

export const phonicsLookupResponseSchema = z.object({
  category: z.string(),
  rule_explanation: z.string(),
  examples: z.array(z.string()),
  similarity_score: z.number()
});

export type PhonicsLookupResponse = z.infer<typeof phonicsLookupResponseSchema>;
