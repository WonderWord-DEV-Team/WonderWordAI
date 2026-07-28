// ticket: integrate playful practice recommendations into parent dashboard
export const practiceRecommendationQueryKeys = {
  all: ["practiceRecommendation"] as const,
  detail: (phonicsCategory: string) =>
    [...practiceRecommendationQueryKeys.all, phonicsCategory] as const
};
