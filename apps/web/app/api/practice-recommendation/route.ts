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
    return localErrorResponse("invalid_request", "childId and phonicsCategory are required.", 400);
  }

  const { childId, phonicsCategory } = parsedRequest.data;

  const supabase = createClient();
  const { appUser, response: authResponse } = await getAuthenticatedAppUser(supabase);

  if (authResponse) {
    return authResponse;
  }

  if (appUser.role !== "PARENT") {
    return localErrorResponse("forbidden", "Only parent accounts can request practice activities.", 403);
  }

  // Verify this parent actually owns the requested child — never trust a
  // childId coming from the client alone.
  const { data: parentRow } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", appUser.authId)
    .eq("role", "PARENT")
    .single();

  if (!parentRow) {
    return localErrorResponse("forbidden", "Could not verify parent account.", 403);
  }

  const { data: link } = await supabase
    .from("parent_child")
    .select("child_id")
    .eq("parent_id", parentRow.id)
    .eq("child_id", childId)
    .maybeSingle();

  if (!link) {
    return localErrorResponse("forbidden", "You are not authorized to access this child.", 403);
  }

  const { data: profile } = await supabase
    .from("child_profiles")
    .select("name")
    .eq("child_id", childId)
    .maybeSingle();

  // Recent words this child actually got wrong in this specific phonics
  // category — this is what makes the generated activity specific to this
  // occasion, instead of a generic lookup by category alone.
  const { data: miscueRows } = await supabase
    .from("reading_events")
    .select("word")
    .eq("child_id", childId)
    .eq("phonics_category", phonicsCategory)
    .eq("is_correct", false)
    .order("timestamp", { ascending: false })
    .limit(8);

  const recentMiscueWords = (miscueRows ?? []).map((row) => row.word);

  try {
    const activity = await getActivityRecommendation({
      phonicsCategory,
      recentMiscueWords,
      childName: profile?.name ?? null
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
        steps: activity.steps,
        recommendation: activity.recommendation
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