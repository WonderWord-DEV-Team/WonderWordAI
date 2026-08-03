import { z } from "zod";
import { apiFetchJson } from "@/lib/api/client";

// ticket: wire ChildReadingShell up to /api/stories/generate
const generatedStorySchema = z.object({
  id: z.string(),
  child_id: z.string(),
  word: z.string(),
  story_text: z.string(),
  image_url: z.string().nullable(),
  validation_score: z.number(),
  phonics_category: z.string(),
  theme: z.string().nullable(),
  created_at: z.string()
});

const generateStoryResponseSchema = z.object({
  data: generatedStorySchema
});

export type GeneratedStory = z.infer<typeof generatedStorySchema>;

export type GenerateStoryInput = {
  childId: string;
  word: string;
  // phonicsCategory is optional now -- the server derives it from
  // /phonics-lookup when omitted, since option B has no client-side source for it
  phonicsCategory?: string;
  theme?: string;
};

export async function generateStory(input: GenerateStoryInput) {
  const payload = await apiFetchJson<unknown>("/api/stories/generate", {
    method: "POST",
    body: JSON.stringify(input)
  });

  return generateStoryResponseSchema.parse(payload).data;
}