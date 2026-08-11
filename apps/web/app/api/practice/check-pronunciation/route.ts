import "server-only";

import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { parseUserRole, type UserRole } from "@/lib/auth/types";
// Reused rather than re-implemented: MediaRecorder reports its mimeType
// with codec parameters attached (e.g. "audio/webm;codecs=opus"), and a
// naive exact-match check against a bare "audio/webm" string rejects
// every real recording. isAllowedAudioType already handles this correctly
// for the main reading-session upload, so this route stays consistent
// with it instead of re-deriving (and re-breaking) the same logic.
import { isAllowedAudioType } from "@/lib/audio/schema";

// IMPORTANT: everything this route needs lives in this single file,
// deliberately. `apps/web/lib/practice/` already exists in this repo for
// the parent-dashboard practice-recommendation feature
// (getPracticeRecommendation, practiceRecommendationResponseSchema, a
// PracticeErrorCode type, etc.) -- an earlier version of this route
// introduced a *new* lib/practice/client.ts and lib/practice/schema.ts
// that collided with and overwrote those files, breaking the build
// (client-side code importing the practice-recommendation module pulled
// in this route's "server-only" import transitively). To make that
// class of bug structurally impossible, this route does not add
// anything under lib/practice/ at all.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Generous for a single short word recording (contrast with the full
// reading-session upload limit in /api/sessions/[id]/audio, which allows
// much longer passages).
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

const DEFAULT_ML_SERVICE_URL = "http://localhost:8000";

// Shape returned directly by the ml-service's /detect-miscue endpoint (see
// apps/ml-service/services/wav2vec_service.py detect_miscue()).
const mlPronunciationResponseSchema = z.object({
  phonemes: z.array(z.string()),
  similarity: z.number(),
  confidence: z.boolean()
});

type RouteErrorCode =
  | "configuration_error"
  | "word_missing"
  | "audio_missing"
  | "audio_empty"
  | "audio_too_large"
  | "invalid_audio_type"
  | "unauthorized"
  | "forbidden"
  | "internal_error";

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

  const serviceKey = process.env.ML_SERVICE_KEY;
  if (!serviceKey) {
    return errorResponse("configuration_error", "ML service authentication key is not configured.", 500);
  }

  const baseUrl = process.env.ML_SERVICE_URL || DEFAULT_ML_SERVICE_URL;
  const upstreamForm = new FormData();
  upstreamForm.set("audio", audio, audio.name || "practice-attempt.webm");
  upstreamForm.set("reference_text", word.trim());

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(`${baseUrl}/detect-miscue`, {
      method: "POST",
      headers: { "X-Internal-Key": serviceKey },
      body: upstreamForm
    });
  } catch (error) {
    console.error("Failed to connect to ML service for pronunciation check.", error);
    return errorResponse("internal_error", "Unable to connect to the pronunciation check service.", 500);
  }

  if (upstreamResponse.status === 401 || upstreamResponse.status === 403) {
    return errorResponse("unauthorized", "Unauthorized access to pronunciation check service.", upstreamResponse.status);
  }

  if (!upstreamResponse.ok) {
    const errorBody = await upstreamResponse.json().catch(() => null);
    const message = errorBody?.detail || "Upstream ML service returned an error.";
    return errorResponse("internal_error", message, upstreamResponse.status);
  }

  const upstreamData = await upstreamResponse.json().catch(() => null);
  const parsedUpstream = mlPronunciationResponseSchema.safeParse(upstreamData);

  if (!parsedUpstream.success) {
    console.error("ML pronunciation response validation failed.", parsedUpstream.error);
    return errorResponse("internal_error", "Pronunciation check service returned a malformed response.", 500);
  }

  return NextResponse.json({
    correct: parsedUpstream.data.confidence,
    similarity: parsedUpstream.data.similarity,
    phonemes: parsedUpstream.data.phonemes
  });
}

async function getAuthenticatedAppUser(
  supabase: SupabaseClient
): Promise<
  | { appUser: AppUser; response: null }
  | { appUser: null; response: NextResponse }
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

function errorResponse(code: RouteErrorCode, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}