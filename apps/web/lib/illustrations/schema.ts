import { z } from "zod";

export const imageGenerationRequestSchema = z
  .object({
    word: z.string().min(1, "word is required"),
    mode: z.enum(["unsplash", "openai", "auto"]).optional().default("auto")
  })
  .strict();

export type ImageGenerationRequest = z.infer<typeof imageGenerationRequestSchema>;

export const imageGenerationResponseSchema = z
  .object({
    url: z.string(),
    source: z.string()
  })
  .strict();

export type ImageGenerationResponse = z.infer<typeof imageGenerationResponseSchema>;
