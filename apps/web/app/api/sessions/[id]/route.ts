import { NextRequest, NextResponse } from "next/server";
import {
  closeE2eSession,
  findE2eSessionForChild,
  getE2eAuthState,
  isE2eMode,
  toE2eReadingSession
} from "@/lib/e2e/fixtures";
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

export async function GET(_request: NextRequest, { params }: RouteContext) {
  if (isE2eMode()) {
    return handleE2eGetSession(_request, params.id);
  }

  if (!hasSupabaseEnv()) {
    return errorResponse("configuration_error", "Supabase is not configured.", 500);
  }

  const parsedSessionId = sessionIdSchema.safeParse(params.id);

  if (!parsedSessionId.success) {
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

  const { data: session, error: sessionError } = await supabase
    .from("reading_sessions")
    .select(READING_SESSION_SELECT)
    .eq("id", parsedSessionId.data)
    .maybeSingle<ReadingSessionRow>();

  if (sessionError) {
    console.error("Failed to fetch reading session.", sessionError);

    return errorResponse("internal_error", "Unable to verify the reading session.", 500);
  }

  if (!session || session.child_id !== appUser.id) {
    return errorResponse("not_found", "Reading session not found.", 404);
  }

  return NextResponse.json({ session: toReadingSession(session) });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  if (isE2eMode()) {
    return handleE2eCloseSession(request, params.id);
  }

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

function handleE2eGetSession(request: NextRequest, sessionId: string) {
  const parsedSessionId = sessionIdSchema.safeParse(sessionId);

  if (!parsedSessionId.success) {
    return validationErrorResponse();
  }

  const auth = getE2eAuthState(request.cookies);
  if (auth.status === "unauthenticated") {
    return errorResponse("unauthorized", "Authentication is required.", 401);
  }

  if (auth.status !== "authenticated" || auth.appUser.role !== "CHILD") {
    return errorResponse("not_found", "Reading session not found.", 404);
  }

  const session = findE2eSessionForChild(parsedSessionId.data, auth.appUser.id);

  if (!session) {
    return errorResponse("not_found", "Reading session not found.", 404);
  }

  return NextResponse.json({ session: toE2eReadingSession(session) });
}

async function handleE2eCloseSession(request: NextRequest, sessionId: string) {
  const parsedSessionId = sessionIdSchema.safeParse(sessionId);

  if (!parsedSessionId.success) {
    return validationErrorResponse();
  }

  const body = await readJsonObject(request);
  const parsedBody = body ? closeSessionRequestSchema.safeParse(body) : null;

  if (!parsedBody?.success) {
    return validationErrorResponse();
  }

  const auth = getE2eAuthState(request.cookies);
  if (auth.status === "unauthenticated") {
    return errorResponse("unauthorized", "Authentication is required.", 401);
  }

  if (auth.status !== "authenticated" || auth.appUser.role !== "CHILD") {
    return errorResponse("not_found", "Reading session not found.", 404);
  }

  const session = closeE2eSession(parsedSessionId.data, auth.appUser.id);

  if (!session) {
    return errorResponse("not_found", "Reading session not found.", 404);
  }

  return NextResponse.json({ session: toE2eReadingSession(session) });
}
