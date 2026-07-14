import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  createSessionRequestSchema,
  errorResponse,
  getAuthenticatedAppUser,
  listSessionsQuerySchema,
  readJsonObject,
  READING_SESSION_SELECT,
  toReadingSession,
  validationErrorResponse,
  type ReadingSessionRow
} from "@/lib/sessions/api";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return errorResponse("configuration_error", "Supabase is not configured.", 500);
  }

  const body = await readJsonObject(request);
  const parsedBody = body ? createSessionRequestSchema.safeParse(body) : null;

  if (!parsedBody?.success) {
    return validationErrorResponse();
  }

  const supabase = createClient();
  const { appUser, response } = await getAuthenticatedAppUser(supabase);

  if (response) {
    return response;
  }

  if (appUser.role !== "CHILD") {
    return errorResponse("forbidden", "Only child accounts can create reading sessions.", 403);
  }

  const { data, error } = await supabase
    .from("reading_sessions")
    .insert({ child_id: appUser.id })
    .select(READING_SESSION_SELECT)
    .single<ReadingSessionRow>();

  if (error) {
    console.error("Failed to create reading session.", error);

    return errorResponse("internal_error", "Unable to create a reading session.", 500);
  }

  return NextResponse.json({ session: toReadingSession(data) }, { status: 201 });
}

export async function GET(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return errorResponse("configuration_error", "Supabase is not configured.", 500);
  }

  const parsedQuery = listSessionsQuerySchema.safeParse({
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined
  });

  if (!parsedQuery.success) {
    return validationErrorResponse();
  }

  const supabase = createClient();
  const { appUser, response } = await getAuthenticatedAppUser(supabase);

  if (response) {
    return response;
  }

  let query = supabase
    .from("reading_sessions")
    .select(READING_SESSION_SELECT)
    .order("start_time", { ascending: false })
    .limit(parsedQuery.data.limit);

  if (appUser.role === "CHILD") {
    query = query.eq("child_id", appUser.id);
  }

  if (parsedQuery.data.status === "open") {
    query = query.is("end_time", null);
  } else if (parsedQuery.data.status === "closed") {
    query = query.not("end_time", "is", null);
  }

  const { data, error } = await query.returns<ReadingSessionRow[]>();

  if (error) {
    console.error("Failed to list reading sessions.", error);

    return errorResponse("internal_error", "Unable to list reading sessions.", 500);
  }

  return NextResponse.json({ sessions: data.map(toReadingSession) });
}
