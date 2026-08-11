import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { parseUserRole, type UserRole } from "@/lib/auth/types";
import { createServiceClient } from "@/lib/supabase/service";

export type PlanId = "free" | "plan1" | "plan2";

export const READING_SESSION_SELECT =
  "id, child_id, start_time, end_time, total_words, correct_words, created_at";

export type ReadingSessionRow = {
  id: string;
  child_id: string;
  start_time: string;
  end_time: string | null;
  total_words: number;
  correct_words: number;
  created_at: string;
};

export type ReadingSessionStatus = "open" | "closed";

export type ReadingSession = {
  id: string;
  childId: string;
  startTime: string;
  endTime: string | null;
  status: ReadingSessionStatus;
  totalWords: number;
  correctWords: number;
  createdAt: string;
};

export type AppUser = {
  id: string;
  authId: string;
  role: UserRole;
};

type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "invalid_request"
  | "configuration_error"
  | "internal_error";

export const createSessionRequestSchema = z.object({}).strict();

export const listSessionsQuerySchema = z.object({
  status: z.enum(["open", "closed"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const closeSessionRequestSchema = z
  .object({
    action: z.literal("close")
  })
  .strict();

export const sessionIdSchema = z.string().uuid();

export function errorResponse(error: ApiErrorCode, message: string, status: number) {
  return NextResponse.json({ error, message }, { status });
}

export function validationErrorResponse() {
  return errorResponse("invalid_request", "The request payload is invalid.", 400);
}

export async function readJsonObject(request: Request) {
  const rawBody = await request.text();

  if (!rawBody.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawBody);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function getAuthenticatedAppUser(
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
    console.error("Failed to resolve authenticated application user.", appUserError);

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

export async function getEffectiveAppUserPlan(
  supabase: SupabaseClient,
  appUser: AppUser
): Promise<PlanId> {
  const service = createServiceClient();

  const { data: ownSubscription, error: ownSubscriptionError } = await service
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", appUser.id)
    .maybeSingle<{ plan: PlanId; status: string }>();

  if (!ownSubscriptionError && ownSubscription && ownSubscription.status !== "canceled") {
    return ownSubscription.plan;
  }

  if (appUser.role === "CHILD") {
    const { data: parentLink, error: parentLinkError } = await supabase
      .from("parent_child")
      .select("parent_id")
      .eq("child_id", appUser.id)
      .maybeSingle<{ parent_id: string }>();

    if (!parentLinkError && parentLink?.parent_id) {
      const { data: parentSubscription, error: parentSubscriptionError } = await service
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", parentLink.parent_id)
        .maybeSingle<{ plan: PlanId; status: string }>();

      if (!parentSubscriptionError && parentSubscription && parentSubscription.status !== "canceled") {
        return parentSubscription.plan;
      }
    }
  }

  return "free";
}

export async function getSessionScanCountLast7Days(
  supabase: SupabaseClient,
  childId: string
): Promise<number> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from("reading_sessions")
    .select("id", { count: "exact", head: true })
    .eq("child_id", childId)
    .gte("created_at", sevenDaysAgo);

  if (error) {
    console.error("Failed to count recent reading sessions.", { childId, error });
    throw error;
  }

  return typeof count === "number" ? count : 0;
}

export function toReadingSession(row: ReadingSessionRow): ReadingSession {
  return {
    id: row.id,
    childId: row.child_id,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.end_time ? "closed" : "open",
    totalWords: row.total_words,
    correctWords: row.correct_words,
    createdAt: row.created_at
  };
}
