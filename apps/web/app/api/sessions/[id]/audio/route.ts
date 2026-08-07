import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AudioTranscriptionError, transcribeReadingAudio } from "@/lib/audio/client";
import {
  getPersistableReadingEvents,
  isAllowedAudioType,
  mapMlTranscriptionToSessionAudio,
  MAX_AUDIO_BYTES,
  sessionAudioResponseSchema,
  type SessionAudioErrorCode
} from "@/lib/audio/schema";
import { parseUserRole, type UserRole } from "@/lib/auth/types";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  getEffectiveAppUserPlan,
  sessionIdSchema
} from "@/lib/sessions/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: {
    id: string;
  };
};

type AppUser = {
  id: string;
  authId: string;
  role: UserRole;
};

type ReadingSessionRow = {
  id: string;
  child_id: string;
  end_time: string | null;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  console.log("[audio route] POST start");

  if (!hasSupabaseEnv()) {
    return errorResponse("internal_error", "Application configuration is incomplete.", 500);
  }

  const parsedSessionId = sessionIdSchema.safeParse(params.id);

  if (!parsedSessionId.success) {
    return errorResponse("session_not_found", "Reading session not found.", 404);
  }

  const supabase = createClient();
  console.log("[audio route] before getAuthenticatedAppUser");
  const { appUser, response: authResponse } = await getAuthenticatedAppUser(supabase);
  console.log("[audio route] after getAuthenticatedAppUser", { hasAppUser: Boolean(appUser) });

  if (authResponse) {
    return authResponse;
  }

  if (appUser.role !== "CHILD") {
    return errorResponse("forbidden", "Only child accounts can upload reading audio.", 403);
  }

  console.log("[audio route] before reading_sessions lookup");
  const { data: session, error: sessionError } = await supabase
    .from("reading_sessions")
    .select("id, child_id, end_time")
    .eq("id", parsedSessionId.data)
    .maybeSingle<ReadingSessionRow>();
  console.log("[audio route] after reading_sessions lookup", { found: Boolean(session), error: sessionError?.code });

  if (sessionError) {
    console.error("Failed to fetch reading session for audio upload.", {
      sessionId: parsedSessionId.data,
      code: sessionError.code
    });

    return errorResponse("internal_error", "Unable to verify the reading session.", 500);
  }

  if (!session || session.child_id !== appUser.id) {
    return errorResponse("session_not_found", "Reading session not found.", 404);
  }

  if (session.end_time) {
    return errorResponse("session_closed", "Reading session is already closed.", 409);
  }

  console.log("[audio route] before getEffectiveAppUserPlan");
  const plan = await getEffectiveAppUserPlan(supabase, appUser);
  console.log("[audio route] after getEffectiveAppUserPlan", { plan });

  // Free-tier scan limit temporarily disabled per request — re-enable before launch.
  void plan;

  console.log("[audio route] before getValidatedAudio");
  const { audio, referenceText, response: audioResponse } = await getValidatedAudio(request);
  console.log("[audio route] after getValidatedAudio", { hasAudio: Boolean(audio) });

  if (audioResponse) {
    return audioResponse;
  }

  try {
    console.log("[audio route] before transcribeReadingAudio");
    const mlResult = await transcribeReadingAudio({
      audio,
      referenceText: referenceText ?? undefined
    });
    console.log("[audio route] after transcribeReadingAudio");
    const responseData = mapMlTranscriptionToSessionAudio({
      sessionId: session.id,
      result: mlResult
    });

    const persistableEvents = getPersistableReadingEvents({
      sessionId: session.id,
      childId: appUser.id,
      readingEvents: mlResult.reading_events
    });

    if (persistableEvents.length > 0) {
      const { error: insertError } = await supabase
        .from("reading_events")
        .insert(persistableEvents);

      if (insertError) {
        console.error("Failed to persist derived reading events.", {
          sessionId: session.id,
          childId: appUser.id,
          eventCount: persistableEvents.length,
          code: insertError.code
        });

        return errorResponse(
          "persistence_failed",
          "Unable to persist derived reading results.",
          500
        );
      }
    }

    const responsePayload = { data: responseData };
    const parsedResponse = sessionAudioResponseSchema.safeParse(responsePayload);

    if (!parsedResponse.success) {
      console.error("Outgoing session audio response validation failed.", {
        sessionId: session.id,
        issues: parsedResponse.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      });

      return errorResponse(
        "malformed_transcription_response",
        "Unable to format transcription results.",
        502
      );
    }

    return NextResponse.json(parsedResponse.data);
  } catch (error) {
    if (error instanceof AudioTranscriptionError) {
      return errorResponse(error.code, error.message, error.status);
    }

    console.error("Unexpected error while processing session audio.", {
      sessionId: session.id,
      message: error instanceof Error ? error.message : "Unknown error"
    });

    return errorResponse("internal_error", "Unable to process reading audio.", 500);
  }
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
    console.error("Failed to resolve authenticated application user for audio upload.", {
      authId: user.id,
      code: appUserError.code
    });

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
      authId: appUserRow.auth_id,
      role
    },
    response: null
  };
}

async function getValidatedAudio(request: NextRequest): Promise<
  | { audio: File; referenceText: string | null; response: null }
  | { audio: null; referenceText: null; response: NextResponse }
> {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return {
      audio: null,
      referenceText: null,
      response: errorResponse("audio_missing", "No audio file provided.", 400)
    };
  }

  const audio = formData.get("audio");

  if (!(audio instanceof File)) {
    return {
      audio: null,
      referenceText: null,
      response: errorResponse("audio_missing", "No audio file provided.", 400)
    };
  }

  if (audio.size === 0) {
    return {
      audio: null,
      referenceText: null,
      response: errorResponse("audio_empty", "Audio file is empty.", 400)
    };
  }

  if (audio.size > MAX_AUDIO_BYTES) {
    return {
      audio: null,
      referenceText: null,
      response: errorResponse("audio_too_large", "Audio file is too large.", 413)
    };
  }

  if (!isAllowedAudioType(audio.type)) {
    return {
      audio: null,
      referenceText: null,
      response: errorResponse("invalid_audio_type", "Audio format is not supported.", 400)
    };
  }

  const referenceText = formData.get("reference_text");

  return {
    audio,
    referenceText: typeof referenceText === "string" ? referenceText.trim() || null : null,
    response: null
  };
}

function errorResponse(code: SessionAudioErrorCode, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}
