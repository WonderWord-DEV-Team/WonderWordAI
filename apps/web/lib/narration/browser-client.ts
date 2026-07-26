import { apiFetchJson } from "@/lib/api/client";
import {
  storyNarrationResponseSchema,
  type NarrationWord,
  type StoryNarration
} from "@/lib/narration/schema";

export type { NarrationWord, StoryNarration };

export async function getOrCreateStoryNarration(storyId: string): Promise<StoryNarration> {
  const payload = await apiFetchJson<unknown>(
    `/api/stories/${encodeURIComponent(storyId)}/narration`,
    {
      method: "POST"
    }
  );

  return storyNarrationResponseSchema.parse(payload).data;
}
