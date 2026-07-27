import "server-only";

import {
  mlActivityRecommendationResponseSchema,
  type MlActivityRecommendationResponse,
  type PracticeErrorCode
} from "./schema";

const DEFAULT_ML_SERVICE_URL = "http://localhost:8000";

// ticket: integrate playful practice recommendations into parent dashboard
export class PracticeUpstreamError extends Error {
  code: PracticeErrorCode;
  status: number;

  constructor(code: PracticeErrorCode, message: string, status: number) {
    super(message);
    this.name = "PracticeUpstreamError";
    this.code = code;
    this.status = status;
  }
}

export async function getActivityRecommendation({
  phonicsCategory
}: {
  phonicsCategory: string;
}): Promise<MlActivityRecommendationResponse> {
  const baseUrl = process.env.ML_SERVICE_URL || DEFAULT_ML_SERVICE_URL;
  const serviceKey = process.env.ML_SERVICE_KEY;

  if (!serviceKey) {
    throw new PracticeUpstreamError(
      "configuration_error",
      "ML service authentication key is not configured.",
      500
    );
  }

  const endpoint = `${baseUrl}/activity-recommendation`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": serviceKey
      },
      body: JSON.stringify({
        phonics_category: phonicsCategory
      })
    });
  } catch (error) {
    console.error("Failed to connect to ML service for activity recommendation.", error);
    throw new PracticeUpstreamError(
      "internal_error",
      "Unable to connect to the activity recommendation service.",
      500
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new PracticeUpstreamError(
      "internal_error",
      "Unauthorized access to activity recommendation service.",
      response.status
    );
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message = errorBody?.detail || "Upstream ML service returned an error.";
    throw new PracticeUpstreamError("internal_error", message, response.status);
  }

  const data = await response.json().catch(() => null);

  const parsed = mlActivityRecommendationResponseSchema.safeParse(data);
  if (!parsed.success) {
    console.error("ML activity recommendation response validation failed.", parsed.error);
    throw new PracticeUpstreamError(
      "internal_error",
      "Activity recommendation service returned a malformed response.",
      500
    );
  }

  return parsed.data;
}
