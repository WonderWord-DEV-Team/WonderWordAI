import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { parseUserRole, type UserRole } from "@/lib/auth/types";
import { checkPronunciation, PracticeUpstreamError } from "@/lib/practice/client";
import {
  pronunciationCheckResponseSchema,
  type PracticeErrorCode,
  type PracticeErrorBody
} from "@/lib/practice/schema";
// Reused rather than re-implemented: MediaRecorder reports its mimeType
// with codec parameters attached (e.g. "audio/webm;codecs=opus"), and a
// naive exact-match check against a bare "audio/webm" string rejects
// every real recording. isAllowedAudioType already handles this correctly
// for the main reading-session upload, so this route stays consistent
// with it instead of re-deriving (and re-breaking) the same logic.
import { isAllowedAudioType } from "@/lib/audio/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Generous for a single short word recording (contrast with the full
// reading-session upload limit in /api/sessions/[id]/audio, which allows
// much longer passages).
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

type AppUser = {
  id: string;
  role: UserRole;
};

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return errorResponse("configuration_error", "Supabase is not configured.", 500);
  }

  const supabase = createClient();
  const { appUser, response: authResponse } = await getAuthenticatedAppUser(supabase);

  if (authResponse) {
    return authResponse;
  }

  // Mirrors /api/sessions/[id]/audio: only child accounts submit reading
  // audio, practice pronunciation included.
  if (appUser.role !== "CHILD") {
    return errorResponse("forbidden", "Only child accounts can submit practice audio.", 403);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("audio_missing", "No audio file provided.", 400);
  }

  const word = formData.get("word");
  if (typeof word !== "string" || !word.trim()) {
    return errorResponse("word_missing", "word is required.", 400);
  }

  const audio = formData.get("audio");
  if (!(audio instanceof File)) {
    return errorResponse("audio_missing", "No audio file provided.", 400);
  }

  if (audio.size === 0) {
    return errorResponse("audio_empty", "Audio file is empty.", 400);
  }

  if (audio.size > MAX_AUDIO_BYTES) {
    return errorResponse("audio_too_large", "Audio file is too large.", 413);
  }

  if (!isAllowedAudioType(audio.type)) {
    return errorResponse("invalid_audio_type", "Audio format is not supported.", 400);
  }

  try {
    const mlResult = await checkPronunciation({ audio, word: word.trim() });

    const responsePayload = {
      correct: mlResult.confidence,
      similarity: mlResult.similarity,
      phonemes: mlResult.phonemes
    };

    const parsed = pronunciationCheckResponseSchema.safeParse(responsePayload);
    if (!parsed.success) {
      console.error("Outgoing pronunciation check response validation failed.", parsed.error);
      return errorResponse("internal_error", "Failed to format the pronunciation check response.", 500);
    }

    return NextResponse.json(parsed.data);
  } catch (error) {
    if (error instanceof PracticeUpstreamError) {
      return errorResponse(error.code, error.message, error.status);
    }

    console.error("Unexpected error in check-pronunciation route.", error);
    return errorResponse("internal_error", "An unexpected error occurred during the pronunciation check.", 500);
  }
}

async function getAuthenticatedAppUser(
  supabase: SupabaseClient
): Promise<
  | { appUser: AppUser; response: null }
  | { appUser: null; response: NextResponse<PracticeErrorBody> }
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
    console.error("Failed to resolve authenticated user for pronunciation check.", appUserError);
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

function errorResponse(code: PracticeErrorCode, message: string, status: number) {
  return NextResponse.json<PracticeErrorBody>({ error: { code, message } }, { status });
}   