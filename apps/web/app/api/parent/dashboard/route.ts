import { NextRequest, NextResponse } from "next/server";
import {
  buildParentDashboard,
  getPeriodStart,
  parentDashboardQuerySchema,
  type DashboardChildProfile,
  type DashboardSession
} from "@/lib/parent/dashboard";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { errorResponse, getAuthenticatedAppUser } from "@/lib/sessions/api";

export const dynamic = "force-dynamic";

const CHILD_PROFILE_SELECT = "child_id, name";
const DASHBOARD_SESSION_SELECT =
  "id, child_id, start_time, end_time, total_words, correct_words";
const SESSION_PAGE_SIZE = 1000;

type ParentChildRow = {
  child_id: string;
};

type ChildProfileRow = {
  child_id: string;
  name: string;
};

type DashboardSessionRow = {
  id: string;
  child_id: string;
  start_time: string;
  end_time: string | null;
  total_words: number;
  correct_words: number;
};

export async function GET(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return errorResponse("configuration_error", "Supabase is not configured.", 500);
  }

  const parsedQuery = parentDashboardQuerySchema.safeParse({
    period: request.nextUrl.searchParams.get("period") ?? undefined
  });

  if (!parsedQuery.success) {
    return errorResponse("invalid_request", "The request query is invalid.", 400);
  }

  const supabase = createClient();
  const { appUser, response } = await getAuthenticatedAppUser(supabase);

  if (response) {
    return response;
  }

  if (appUser.role !== "PARENT") {
    return errorResponse("forbidden", "Only parent accounts can access the dashboard.", 403);
  }

  const { data: links, error: linksError } = await supabase
    .from("parent_child")
    .select("child_id")
    .eq("parent_id", appUser.id)
    .returns<ParentChildRow[]>();

  if (linksError) {
    console.error("Failed to fetch linked children for parent dashboard.", linksError);

    return errorResponse("internal_error", "Unable to load the parent dashboard.", 500);
  }

  const linkedChildIds = links.map((link) => link.child_id);

  if (linkedChildIds.length === 0) {
    return NextResponse.json({
      data: {
        period: parsedQuery.data.period,
        children: []
      }
    });
  }

  const { data: childProfiles, error: childProfilesError } = await supabase
    .from("child_profiles")
    .select(CHILD_PROFILE_SELECT)
    .in("child_id", linkedChildIds)
    .order("name", { ascending: true })
    .returns<ChildProfileRow[]>();

  if (childProfilesError) {
    console.error("Failed to fetch child profiles for parent dashboard.", childProfilesError);

    return errorResponse("internal_error", "Unable to load the parent dashboard.", 500);
  }

  const children: DashboardChildProfile[] = childProfiles.map((child) => ({
    id: child.child_id,
    name: child.name
  }));

  if (children.length === 0) {
    return NextResponse.json({
      data: {
        period: parsedQuery.data.period,
        children: []
      }
    });
  }

  const sessions = await fetchDashboardSessions({
    supabase,
    childIds: children.map((child) => child.id),
    periodStart: getPeriodStart(parsedQuery.data.period)
  });

  if (sessions.error) {
    console.error("Failed to fetch reading sessions for parent dashboard.", sessions.error);

    return errorResponse("internal_error", "Unable to load the parent dashboard.", 500);
  }

  return NextResponse.json(
    buildParentDashboard({
      period: parsedQuery.data.period,
      children,
      sessions: sessions.data
    })
  );
}

async function fetchDashboardSessions({
  supabase,
  childIds,
  periodStart
}: {
  supabase: ReturnType<typeof createClient>;
  childIds: string[];
  periodStart: Date | null;
}): Promise<{ data: DashboardSession[]; error: null } | { data: []; error: unknown }> {
  const rows: DashboardSessionRow[] = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from("reading_sessions")
      .select(DASHBOARD_SESSION_SELECT)
      .in("child_id", childIds)
      .order("start_time", { ascending: false })
      .range(from, from + SESSION_PAGE_SIZE - 1);

    if (periodStart) {
      query = query.gte("start_time", periodStart.toISOString());
    }

    const { data, error } = await query.returns<DashboardSessionRow[]>();

    if (error) {
      return { data: [], error };
    }

    rows.push(...data);

    if (data.length < SESSION_PAGE_SIZE) {
      break;
    }

    from += SESSION_PAGE_SIZE;
  }

  return {
    data: rows.map((row) => ({
      id: row.id,
      childId: row.child_id,
      startTime: row.start_time,
      endTime: row.end_time,
      totalWords: row.total_words,
      correctWords: row.correct_words
    })),
    error: null
  };
}
