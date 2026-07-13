import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  closeSessionRequestSchema,
  errorResponse,
  getAuthenticatedAppUser,
  readJsonObject,
  READING_SESSION_SELECT,
  sessionIdSchema,
  toReadingSession,
  validationErrorResponse,
  type ReadingSessionRow
} from "@/lib/sessions/api";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  if (!hasSupabaseEnv()) {
    return errorResponse("configuration_error", "Supabase is not configured.", 500);
  }

  const parsedSessionId = sessionIdSchema.safeParse(params.id);

  if (!parsedSessionId.success) {
    return validationErrorResponse();
  }

  const body = await readJsonObject(request);
  const parsedBody = body ? closeSessionRequestSchema.safeParse(body) : null;

  if (!parsedBody?.success) {
    return validationErrorResponse();
  }

  const supabase = createClient();
  const { appUser, response } = await getAuthenticatedAppUser(supabase);

  if (response) {
    return response;
  }

  if (appUser.role !== "CHILD") {
    return errorResponse("not_found", "Reading session not found.", 404);
  }

  const { data: existingSession, error: existingError } = await supabase
    .from("reading_sessions")
    .select(READING_SESSION_SELECT)
    .eq("id", parsedSessionId.data)
    .maybeSingle<ReadingSessionRow>();

  if (existingError) {
    console.error("Failed to fetch reading session before closing.", existingError);

    return errorResponse("internal_error", "Unable to close the reading session.", 500);
  }

  if (!existingSession || existingSession.child_id !== appUser.id) {
    return errorResponse("not_found", "Reading session not found.", 404);
  }

  if (existingSession.end_time) {
    return NextResponse.json({ session: toReadingSession(existingSession) });
  }

  const { data: closedSession, error: closeError } = await supabase
    .from("reading_sessions")
    .update({ end_time: new Date().toISOString() })
    .eq("id", existingSession.id)
    .is("end_time", null)
    .select(READING_SESSION_SELECT)
    .maybeSingle<ReadingSessionRow>();

  if (closeError) {
    console.error("Failed to close reading session.", closeError);

    return errorResponse("internal_error", "Unable to close the reading session.", 500);
  }

  if (closedSession) {
    return NextResponse.json({ session: toReadingSession(closedSession) });
  }

  const { data: refreshedSession, error: refreshError } = await supabase
    .from("reading_sessions")
    .select(READING_SESSION_SELECT)
    .eq("id", existingSession.id)
    .maybeSingle<ReadingSessionRow>();

  if (refreshError) {
    console.error("Failed to fetch reading session after close race.", refreshError);

    return errorResponse("internal_error", "Unable to close the reading session.", 500);
  }

  if (!refreshedSession || refreshedSession.child_id !== appUser.id) {
    return errorResponse("not_found", "Reading session not found.", 404);
  }

  return NextResponse.json({ session: toReadingSession(refreshedSession) });
}
