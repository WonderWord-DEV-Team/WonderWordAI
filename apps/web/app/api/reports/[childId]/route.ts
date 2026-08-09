import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { errorResponse, getAuthenticatedAppUser } from "@/lib/sessions/api";
import {
  e2eIds,
  e2eReportDeficits,
  getE2eAuthState,
  getE2eLinkedChildIds,
  isE2eMode
} from "@/lib/e2e/fixtures";
import {
  buildFallbackChildReport,
  buildGeneratedChildReport,
  GENERATED_REPORT_SELECT,
  toLiveDeficits,
  type GeneratedReportRow,
  type PhonicsDeficitRow
} from "@/lib/reports/contract";
import {
  childReportResponseSchema,
  reportChildIdParamSchema,
  type ChildReportDeficit
} from "@/lib/reports/schema";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    childId: string;
  };
};

const LIVE_DEFICIT_LIMIT = 5;

export async function GET(_request: NextRequest, { params }: RouteContext) {
  if (isE2eMode()) {
    return handleE2eChildReport(_request, params.childId);
  }

  if (!hasSupabaseEnv()) {
    return errorResponse("configuration_error", "Supabase is not configured.", 500);
  }

  const parsedChildId = reportChildIdParamSchema.safeParse(params.childId);

  if (!parsedChildId.success) {
    return errorResponse("invalid_request", "The request is invalid.", 400);
  }

  const childId = parsedChildId.data;
  const supabase = createClient();
  const { appUser, response } = await getAuthenticatedAppUser(supabase);

  if (response) {
    return response;
  }

  // children can only read their own report, parents only for linked children
  if (appUser.role === "CHILD" && appUser.id !== childId) {
    return errorResponse("forbidden", "You can only view your own report.", 403);
  }

  if (appUser.role === "PARENT") {
    const { data: link, error: linkError } = await supabase
      .from("parent_child")
      .select("child_id")
      .eq("parent_id", appUser.id)
      .eq("child_id", childId)
      .maybeSingle();

    if (linkError) {
      console.error("Failed to verify parent-child link for report access.", linkError);

      return errorResponse("internal_error", "Unable to load the report.", 500);
    }

    if (!link) {
      return errorResponse("forbidden", "You are not authorized to view this report.", 403);
    }
  }

  const { data: report, error: reportError } = await supabase
    .from("generated_reports")
    .select(GENERATED_REPORT_SELECT)
    .eq("child_id", childId)
    .order("cycle_end", { ascending: false })
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle<GeneratedReportRow>();

  if (reportError) {
    console.error("Failed to fetch generated report.", reportError);

    return errorResponse("internal_error", "Unable to load the report.", 500);
  }

  const fallbackDeficits = report ? null : await fetchLiveDeficits(supabase, childId);

  if (fallbackDeficits?.error) {
    console.error("Failed to fetch phonics deficits.", fallbackDeficits.error);

    return errorResponse("internal_error", "Unable to load the report.", 500);
  }

  const responseBody = {
    data: {
      ...(report
        ? buildGeneratedChildReport(childId, report)
        : buildFallbackChildReport(childId, fallbackDeficits?.data ?? []))
    }
  };

  const parsedResponse = childReportResponseSchema.safeParse(responseBody);

  if (!parsedResponse.success) {
    console.error("Generated child report response failed validation.", parsedResponse.error);

    return errorResponse("internal_error", "Unable to load the report.", 500);
  }

  return NextResponse.json(parsedResponse.data);
}

function handleE2eChildReport(request: NextRequest, rawChildId: string) {
  const parsedChildId = reportChildIdParamSchema.safeParse(rawChildId);

  if (!parsedChildId.success) {
    return errorResponse("invalid_request", "The request is invalid.", 400);
  }

  const childId = parsedChildId.data;
  const auth = getE2eAuthState(request.cookies);

  if (auth.status === "unauthenticated") {
    return errorResponse("unauthorized", "Authentication is required.", 401);
  }

  if (auth.status !== "authenticated") {
    return errorResponse("forbidden", "This account is not authorized.", 403);
  }

  if (auth.appUser.role === "CHILD" && auth.appUser.id !== childId) {
    return errorResponse("forbidden", "You can only view your own report.", 403);
  }

  if (auth.appUser.role === "PARENT" && !getE2eLinkedChildIds(auth.appUser.id).includes(childId)) {
    return errorResponse("forbidden", "You are not authorized to view this report.", 403);
  }

  const report =
    childId === e2eIds.childOne
      ? {
          ...buildFallbackChildReport(childId, e2eReportDeficits),
          wcpm: 82,
          wcpmDelta: 6,
          accuracyPct: 91
        }
      : buildFallbackChildReport(childId, []);

  return NextResponse.json({ data: report });
}

async function fetchLiveDeficits(
  supabase: ReturnType<typeof createClient>,
  childId: string
): Promise<{ data: ChildReportDeficit[]; error: null } | { data: []; error: unknown }> {
  const { data, error } = await supabase
    .from("child_phonics_deficits")
    .select("phonics_category, miscue_count, avg_similarity")
    .eq("child_id", childId)
    .order("miscue_count", { ascending: false })
    .limit(LIVE_DEFICIT_LIMIT)
    .returns<PhonicsDeficitRow[]>();

  if (error) {
    return { data: [], error };
  }

  return {
    data: toLiveDeficits(data),
    error: null
  };
}
