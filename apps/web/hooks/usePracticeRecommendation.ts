"use client";

import { useQuery } from "@tanstack/react-query";
import { getPracticeRecommendation } from "@/lib/practice/client";

const PRACTICE_RECOMMENDATION_STALE_TIME_MS = 5 * 60_000;

// ticket: integrate playful practice recommendations into parent dashboard
export function usePracticeRecommendation(
  childId: string | null | undefined,
  phonicsCategory: string | null | undefined
) {
  return useQuery({
    queryKey: ["practice-recommendation", childId ?? "", phonicsCategory ?? ""],
    queryFn: () => getPracticeRecommendation(childId as string, phonicsCategory as string),
    enabled: Boolean(childId) && Boolean(phonicsCategory),
    staleTime: PRACTICE_RECOMMENDATION_STALE_TIME_MS
  });
}