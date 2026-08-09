import { apiFetchJson } from "@/lib/api/client";
import { practiceRecommendationResponseSchema } from "@/lib/practice/schema";

// ticket: integrate playful practice recommendations into parent dashboard
export async function getPracticeRecommendation(childId: string, phonicsCategory: string) {
  const payload = await apiFetchJson<unknown>("/api/practice-recommendation", {
    method: "POST",
    body: JSON.stringify({ childId, phonicsCategory })
  });

  return practiceRecommendationResponseSchema.parse(payload).data;
}