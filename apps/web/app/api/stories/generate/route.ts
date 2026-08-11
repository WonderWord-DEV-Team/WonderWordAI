import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { parseUserRole } from "@/lib/auth/types";
import { generateStoryWithClaude, generateFallbackStory, mapStoryUpstreamError } from "@/lib/stories/client";
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

// Separate, smaller cap for the relaxed fallback stage below -- it isn't
// fighting a fixed vocabulary list, so it should converge fast if it's
// going to converge at all.
const MAX_FALLBACK_ATTEMPTS = 2;

// A fixed score used only for the absolute-last-resort hardcoded template
// (buildLastResortStory), for when even the relaxed Claude fallback fails
// (e.g. the API itself is down). It isn't produced by the guardrail
// pipeline -- there's nothing to grade -- so this is just a marker value,
// not a real score out of 100.
const LAST_RESORT_VALIDATION_SCORE = 25;

type AppUser = {
  id: string;
  role: "CHILD" | "PARENT";
};

// Absolute last resort, used only if even the relaxed fallback generation
// (generateFallbackStory, which still calls Claude) fails outright -- e.g.
// the Anthropic API is unreachable. This is a fixed template, not a real
// story, so it's intentionally a last line of defense rather than the
// primary fallback.
function buildLastResortStory(word: string): string {
  const w = word.toLowerCase();

  return [
    `Look! There is a ${w}.`,
    `"I like the ${w}," said the little cat.`,
    `[VISUAL]`,
    `The cat and the ${w} play. What a happy day!`
  ].join("\n\n");
}

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

  // ticket: allow Dolch/Fry sight words for children with a small known-words list
  // A child with few tracked known words would otherwise get almost no usable
  // vocabulary here, causing Claude to guess at ordinary words that then fail
  // the /validate-story vocabulary guardrail. Mirror the same augmentation the
  // guardrail itself applies (see apps/ml-service/routers/validate_story.py)
  // so Claude is actually told what's allowed, instead of only finding out
  // after the fact via failed-attempt feedback.
  const KNOWN_WORDS_AUGMENT_THRESHOLD = 500;
  if (knownWords.length < KNOWN_WORDS_AUGMENT_THRESHOLD) {
    try {
      const { data: curriculumData, error: curriculumError } = await supabase
        .from("curriculum_words")
        .select("word")
        .in("list_name", ["dolch", "fry"]);

      if (curriculumError) {
        console.error("Failed to fetch curriculum words.", curriculumError);
      } else if (Array.isArray(curriculumData)) {
        const curriculumWords = curriculumData
          .map((row) => (row as { word?: string }).word)
          .filter((w): w is string => Boolean(w));
        knownWords = Array.from(new Set([...knownWords, ...curriculumWords]));
      }
    } catch (error) {
      // if curriculum words can't be fetched, fall back to whatever
      // knownWords we already have rather than failing the whole request
      console.error("Error retrieving curriculum words.", error);
    }
  }

  const knownWordsSet = new Set(knownWords.map((w) => w.toLowerCase()));

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
        // Only suggest example words Claude is actually allowed to use --
        // otherwise these are exactly the kind of words (e.g. CVC drill
        // words like "bag"/"cap"/"sam") that keep failing the vocabulary
        // guardrail after the fact.
        examples: topMatch.example_words.filter((example) => knownWordsSet.has(example.toLowerCase()))
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
    let finalValidationScore: number | null = null;
    let lastValidation: ValidateStoryResponse | null = null;
    let feedback: string[] | undefined;
    let usedLastResort = false;

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

        // ticket: surface pass/fail for each story generation attempt in server logs
        console.log(
          `[stories/generate] attempt ${attempt}/${MAX_GENERATION_ATTEMPTS} for word "${word}": FAILED ` +
            `(could not produce valid story JSON -- ${mapped.code})`
        );

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

      // ticket: surface pass/fail for each story generation attempt in server logs
      console.log(
        `[stories/generate] attempt ${attempt}/${MAX_GENERATION_ATTEMPTS} for word "${word}": ` +
          `${validation.is_valid ? "PASSED" : "FAILED"}` +
          (validation.errors.length ? ` (errors: ${validation.errors.join("; ")})` : "")
      );

      if (validation.is_valid) {
        finalStoryText = storyResult.story_text;
        finalValidationScore = validation.validation_score;
        break;
      }

      feedback = validation.errors;
    }

    // STAGE 2 -- relaxed fallback. The strict, known-words-locked loop
    // above exhausted its attempts (most commonly: a child early in
    // onboarding whose known_words + Dolch/Fry still can't cover ordinary
    // story vocabulary -- see the "adventure" vocabulary-leak issue this
    // was built to work around). Rather than drop straight to a hardcoded
    // template, ask Claude for a real, much shorter story without a fixed
    // vocabulary list, and only check the guardrails that don't depend on
    // one (complexity, content safety, structure) -- vocabulary is
    // intentionally not enforced here, since "no fixed list" is the whole
    // point of this stage.
    if (!finalStoryText) {
      console.log(
        `[stories/generate] word "${word}" strict generation failed after ${MAX_GENERATION_ATTEMPTS} attempt(s); ` +
          `trying relaxed fallback generation.`
      );

      for (let attempt = 1; attempt <= MAX_FALLBACK_ATTEMPTS; attempt += 1) {
        let fallbackResult;
        try {
          fallbackResult = await generateFallbackStory({
            apiKey,
            word,
            phonicsCategory,
            phonicsGrounding
          });
        } catch (fallbackGenerationError) {
          console.log(
            `[stories/generate] fallback attempt ${attempt}/${MAX_FALLBACK_ATTEMPTS} for word "${word}": FAILED to generate`
          );
          continue;
        }

        const fallbackValidation = await validateStoryWithGuardrails({
          storyText: fallbackResult.story_text,
          childId,
          word,
          knownWords
        });

        // Vocabulary is deliberately excluded from the pass/fail decision
        // here -- this stage has no fixed word list to check against.
        const passesNonVocabGuardrails =
          fallbackValidation.guardrails.complexity === "passed" &&
          fallbackValidation.guardrails.content_safety === "passed" &&
          fallbackValidation.guardrails.structure === "passed";

        console.log(
          `[stories/generate] fallback attempt ${attempt}/${MAX_FALLBACK_ATTEMPTS} for word "${word}": ` +
            `${passesNonVocabGuardrails ? "PASSED" : "FAILED"} (vocabulary check skipped)`
        );

        if (passesNonVocabGuardrails) {
          finalStoryText = fallbackResult.story_text;
          finalValidationScore = fallbackValidation.validation_score;
          break;
        }
      }
    }

    const imageUrl = await imageUrlPromise;

    // STAGE 3 -- absolute last resort. Only reached if even the relaxed
    // Claude fallback above couldn't produce anything usable (e.g. the
    // Anthropic API itself is down for both stages). This is the one
    // actual hardcoded template in the flow, kept intentionally minimal
    // as a safety net rather than the default experience.
    if (!finalStoryText) {
      console.log(
        `[stories/generate] word "${word}" relaxed fallback also failed; using last-resort template.`
      );
      console.log("Final validation state before last resort:", lastValidation);

      finalStoryText = buildLastResortStory(word);
      finalValidationScore = LAST_RESORT_VALIDATION_SCORE;
      usedLastResort = true;
    }

    console.log(
      usedLastResort
        ? `[stories/generate] word "${word}" generation used the LAST-RESORT template.`
        : `[stories/generate] word "${word}" generation succeeded (validation score: ${finalValidationScore}).`
    );

    // Saves the generated story to the database
    const { data: storyRecord, error: insertError } = await supabase
      .from("generated_stories")
      .insert({
        child_id: childId,
        word,
        story_text: finalStoryText,
        image_url: imageUrl,
        validation_score: finalValidationScore,
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