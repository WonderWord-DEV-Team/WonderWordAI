import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { parseUserRole } from "@/lib/auth/types";
import { generateStoryWithClaude, mapStoryUpstreamError } from "@/lib/stories/client";
import { validateStoryWithGuardrails, StoryValidationUpstreamError } from "@/lib/stories/validate-client";
import { lookupPhonicsRule, PhonicsUpstreamError } from "@/lib/phonics/client";
import { searchUnsplash } from "@/lib/illustrations/unsplash/client";
import { generateDalleImage } from "@/lib/illustrations/dalle/client";
import {
  storyGenerationRequestSchema,
  type StoryErrorBody,
  type StoryErrorCode,
  type ValidateStoryResponse
} from "@/lib/stories/schema";

export const dynamic = "force-dynamic";

// ticket: implement /api/stories/generate orchestration (known-words -> sonnet -> validate -> image -> store)
// caps how many generate+validate round trips we'll pay for before giving up
const MAX_GENERATION_ATTEMPTS = 3;

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

  const { childId, word, phonicsCategory: requestedPhonicsCategory, theme } = parsedRequest.data;

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
      knownWords = vocabData.words.map((w) => String(w));
    }
  } catch (error) {
    console.error("Error retrieving child known words.", error);
  }

  // ticket: implement /api/stories/generate orchestration (known-words -> sonnet -> validate -> image -> store)
  // PHONICS RAG GROUNDING (best-effort) -- POST /phonics-lookup already does the
  // pgvector similarity search over phonics_knowledge; we just consume its top
  // match here as extra context for Claude. A failure here should never block
  // story generation, so it's isolated in its own try/catch.
  let phonicsGrounding: { ruleExplanation: string; examples: string[] } | null = null;

  let resolvedPhonicsCategory = requestedPhonicsCategory ?? null;
  try {
    const phonicsResult = await lookupPhonicsRule({ stuckWord: word });
    const topMatch = phonicsResult.matches[0];
    if (topMatch) {
      phonicsGrounding = {
        ruleExplanation: topMatch.phonics_rule,
        examples: topMatch.example_words
      };
      resolvedPhonicsCategory ??= topMatch.category;
    }
  } catch (error) {
    if (!(error instanceof PhonicsUpstreamError && error.code === "no_rule_found")) {
      console.warn("Phonics grounding lookup failed; continuing without it.", error);
    }
  }

  const phonicsCategory = resolvedPhonicsCategory ?? "unknown";

  // IMAGE RESOLUTION starts immediately and runs in the background alongside
  // the generate+validate loop below, since it only depends on `word`.
  const resolveImageTask = async (): Promise<string> => {
    try {
      let imageUrl = await searchUnsplash(word);

      if (!imageUrl) {
        imageUrl = await generateDalleImage(word);
      }

      return imageUrl || "/images/placeholder.png";
    } catch (imageError) {
      console.error("Image resolution pipeline failed, falling back to placeholder.", imageError);
      return "/images/placeholder.png";
    }
  };
  const imageUrlPromise = resolveImageTask();

  try {
    // GENERATE + VALIDATE, with up to MAX_GENERATION_ATTEMPTS retries using the
    // previous attempt's guardrail errors as feedback for the next attempt.
    let finalStoryText: string | null = null;
    let lastValidation: ValidateStoryResponse | null = null;
    let feedback: string[] | undefined;

    for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
      let storyResult;
      try {
        storyResult = await generateStoryWithClaude({
          apiKey,
          word,
          phonicsCategory,
          theme,
          knownWords,
          phonicsGrounding,
          feedback
        });
      } catch (generationError) {
        const mapped = mapStoryUpstreamError(generationError);
        // configuration/timeout problems won't be fixed by retrying -- bubble up now
        if (mapped.code === "configuration_error" || mapped.code === "story_timeout") {
          throw generationError;
        }

        feedback = [
          "The previous response was not valid JSON in the required format. " +
            "Return ONLY the JSON object with a single story_text field."
        ];
        continue;
      }

      // a broken validation service won't be fixed by retrying either -- let it bubble up
      const validation = await validateStoryWithGuardrails({
        storyText: storyResult.story_text,
        childId,
        word,
        knownWords
      });

      lastValidation = validation;

      if (validation.is_valid) {
        finalStoryText = storyResult.story_text;
        break;
      }

      feedback = validation.errors;
    }

    const imageUrl = await imageUrlPromise;

    if (!finalStoryText || !lastValidation?.is_valid) {
      const issues = lastValidation?.errors.length ? ` Last issues: ${lastValidation.errors.join("; ")}` : "";
      console.log("Final validation state:", lastValidation);
      return errorResponse(
        "story_validation_failed",
        `We could not generate a story that passed all safety and reading-level checks after ${MAX_GENERATION_ATTEMPTS} attempts.${issues}`,
        502
      );
    }

    // Saves the generated story to the database
    const { data: storyRecord, error: insertError } = await supabase
      .from("generated_stories")
      .insert({
        child_id: childId,
        word,
        story_text: finalStoryText,
        image_url: imageUrl,
        validation_score: lastValidation.validation_score,
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
    if (error instanceof StoryValidationUpstreamError) {
      return errorResponse(error.code, error.message, error.status);
    }

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
