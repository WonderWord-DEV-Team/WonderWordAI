import { z } from "zod";

// ticket: integrate playful practice recommendations into parent dashboard
export const practiceRecommendationRequestSchema = z.object({
  childId: z.string().min(1, "childId is required"),
  phonicsCategory: z.string().min(1, "phonicsCategory is required")
});

export type PracticeRecommendationRequest = z.infer<typeof practiceRecommendationRequestSchema>;

const practiceMaterialSchema = z.object({
  icon: z.string(),
  label: z.string()
});

const practiceStepSchema = z.object({
  title: z.string(),
  description: z.string()
});

// shape returned by the ml service's POST /activity-recommendation
export const mlActivityRecommendationResponseSchema = z.object({
  title: z.string(),
  description: z.string(),
  pedagogy: z.string(),
  phonics_category: z.string(),
  duration_minutes: z.number(),
  materials: z.array(practiceMaterialSchema),
  example_words: z.array(z.string()),
  steps: z.array(practiceStepSchema),
  recommendation: z.string().nullable()
});

export type MlActivityRecommendationResponse = z.infer<typeof mlActivityRecommendationResponseSchema>;  

const practiceRecommendationSchema = z.object({
  title: z.string(),
  description: z.string(),
  pedagogy: z.string(),
  phonicsCategory: z.string(),
  durationMinutes: z.number(),
  materials: z.array(practiceMaterialSchema),
  exampleWords: z.array(z.string()),
  steps: z.array(practiceStepSchema),
  recommendation: z.string().nullable()
});

// shape returned by our own /api/practice-recommendation route
export const practiceRecommendationResponseSchema = z.object({
  data: practiceRecommendationSchema
});

export type PracticeRecommendationResponse = z.infer<typeof practiceRecommendationResponseSchema>;
export type PracticeRecommendation = z.infer<typeof practiceRecommendationSchema>;
export type PracticeMaterial = z.infer<typeof practiceMaterialSchema>;
export type PracticeStep = z.infer<typeof practiceStepSchema>;

export type PracticeErrorCode = "configuration_error" | "invalid_request" | "internal_error" | "forbidden";