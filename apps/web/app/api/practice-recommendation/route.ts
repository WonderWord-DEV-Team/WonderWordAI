import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { errorResponse, getAuthenticatedAppUser, readJsonObject } from "@/lib/sessions/api";
import {
  practiceRecommendationRequestSchema,
  type PracticeErrorCode
} from "@/lib/practice/schema";
import { getActivityRecommendation, PracticeUpstreamError } from "@/lib/practice/ml-client";

export const dynamic = "force-dynamic";

// ticket: integrate playful practice recommendations into parent dashboard
export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return localErrorResponse("configuration_error", "Supabase is not configured.", 500);
  }

  const body = await readJsonObject(request);
  if (!body) {
    return localErrorResponse("invalid_request", "The request payload is invalid.", 400);
  }

  const parsedRequest = practiceRecommendationRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return localErrorResponse("invalid_request", "phonicsCategory is required.", 400);
  }

  const supabase = createClient();
  const { appUser, response: authResponse } = await getAuthenticatedAppUser(supabase);

  if (authResponse) {
    return authResponse;
  }

  // any authenticated app user can look up a practice activity; the endpoint
  // is not scoped to a specific child, only to a phonics category
  void appUser;

  try {
    const activity = await getActivityRecommendation({
      phonicsCategory: parsedRequest.data.phonicsCategory
    });

    return NextResponse.json({
      data: {
        title: activity.title,
        description: activity.description,
        pedagogy: activity.pedagogy,
        phonicsCategory: activity.phonics_category,
        durationMinutes: activity.duration_minutes,
        materials: activity.materials,
        exampleWords: activity.example_words,
        steps: activity.steps
      }
    });
  } catch (error) {
    if (error instanceof PracticeUpstreamError) {
      return localErrorResponse(error.code, error.message, error.status);
    }

    console.error("Unexpected error in practice-recommendation route:", error);
    return localErrorResponse(
      "internal_error",
      "An unexpected error occurred while fetching the practice recommendation.",
      500
    );
  }
}

function localErrorResponse(code: PracticeErrorCode, message: string, status: number) {
  return errorResponse(code, message, status);
}
