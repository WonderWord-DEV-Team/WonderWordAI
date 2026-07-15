import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { parseUserRole } from "@/lib/auth/types";
import { generateStoryWithClaude, mapStoryUpstreamError } from "@/lib/stories/client";
import {
  storyGenerationRequestSchema,
  type StoryErrorBody,
  type StoryErrorCode
} from "@/lib/stories/schema";

export const dynamic = "force-dynamic";

type AppUser = {
  id: string;
  role: "CHILD" | "PARENT";
};

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return errorResponse("configuration_error", "Supabase is not configured.", 500);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    console.error("Failed to parse story generation request body.", error);
    return errorResponse("validation_error", "Invalid JSON request body.", 400);
  }

  const parsedRequest = storyGenerationRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return errorResponse(
      "validation_error",
      parsedRequest.error.issues[0]?.message || "Validation failed.",
      400
    );
  }

  const { childId, word, phonicsCategory, theme } = parsedRequest.data;

  // USER AUTHENTICATION
  const supabase = createClient();
  const { appUser, response } = await getAuthenticatedUser(supabase);
  if (response) {
    return response;
  }

  // ACCESS CONTROL (AUTHORIZATION)
  if (appUser.role === "CHILD" && appUser.id !== childId) {
    return errorResponse("forbidden", "You can only generate stories for yourself.", 403);
  }

  if (appUser.role === "PARENT") {
    const { data: relationship, error: relError } = await supabase
      .from("parent_child")
      .select("parent_id")
      .eq("parent_id", appUser.id)
      .eq("child_id", childId)
      .maybeSingle();

    if (relError) {
      console.error("Failed to verify parent-child relationship.", relError);
      return errorResponse("internal_error", "Unable to verify user permissions.", 500);
    }

    if (!relationship) {
      return errorResponse("forbidden", "You are not authorized to generate stories for this child.", 403);
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return errorResponse("configuration_error", "Story generation is not configured.", 500);
  }

  // CHILD'S KNOWN VOCABULARY RETRIEVAL
  let knownWords: string[] = [];
  try {
    const { data: vocabData, error: vocabError } = await supabase
      .from("child_known_words")
      .select("words")
      .eq("child_id", childId)
      .maybeSingle();

    if (vocabError) {
      console.error("Failed to fetch child known words.", vocabError);
    } else if (vocabData && Array.isArray(vocabData.words)) {
      knownWords = vocabData.words.map(w => String(w));
    }
  } catch (error) {
    console.error("Error retrieving child known words.", error);
  }

  // CLAUDE STORY GENERATION AND PERSISTENCE
  try {
    const result = await generateStoryWithClaude({
      apiKey,
      word,
      phonicsCategory,
      theme,
      knownWords
    });

    // Saves the generated story to the database
    const { data: storyRecord, error: insertError } = await supabase
      .from("generated_stories")
      .insert({
        child_id: childId,
        word,
        story_text: result.story_text,
        validation_score: result.validation_score,
        phonics_category: phonicsCategory,
        theme: theme || null
      })
      .select()
      .single();


    if (insertError) {
      console.error("Failed to save generated story to database.", insertError);
      return errorResponse("internal_error", "Story generated but failed to save.", 500);
    }

    return NextResponse.json({
      data: storyRecord
    });
  } catch (error) {
    console.error("Story generation failed:", error);
    const stableError = mapStoryUpstreamError(error);
    return errorResponse(stableError.code, stableError.message, stableError.status);
  }

}

async function getAuthenticatedUser(
  supabase: ReturnType<typeof createClient>
): Promise<
  | { appUser: AppUser; response: null }
  | { appUser: null; response: NextResponse<StoryErrorBody> }
> {
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      appUser: null,
      response: errorResponse("unauthorized", "Authentication is required.", 401)
    };
  }

  const { data: appUserRow, error: appUserError } = await supabase
    .from("users")
    .select("id, auth_id, role")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (appUserError) {
    console.error("Failed to resolve authenticated user.", appUserError);
    return {
      appUser: null,
      response: errorResponse("internal_error", "Unable to resolve the authenticated user.", 500)
    };
  }

  const role = parseUserRole(appUserRow?.role);
  if (!appUserRow || !role) {
    return {
      appUser: null,
      response: errorResponse("forbidden", "This account is not authorized.", 403)
    };
  }

  return {
    appUser: {
      id: appUserRow.id,
      role
    },
    response: null
  };
}

function errorResponse(code: StoryErrorCode, message: string, status: number) {
  return NextResponse.json<StoryErrorBody>({ error: { code, message } }, { status });
}
