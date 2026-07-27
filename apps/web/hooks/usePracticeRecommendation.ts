"use client";

import { useQuery } from "@tanstack/react-query";
import { getPracticeRecommendation } from "@/lib/practice/client";
import { practiceRecommendationQueryKeys } from "@/lib/practice/keys";

const PRACTICE_RECOMMENDATION_STALE_TIME_MS = 5 * 60_000;

// ticket: integrate playful practice recommendations into parent dashboard
export function usePracticeRecommendation(phonicsCategory: string | null | undefined) {
  return useQuery({
    queryKey: practiceRecommendationQueryKeys.detail(phonicsCategory ?? ""),
    queryFn: () => getPracticeRecommendation(phonicsCategory as string),
    enabled: Boolean(phonicsCategory),
    staleTime: PRACTICE_RECOMMENDATION_STALE_TIME_MS
  });
}
