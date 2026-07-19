import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { errorResponse, getAuthenticatedAppUser } from "@/lib/sessions/api";
import { reportChildIdParamSchema, type ChildReportDeficit } from "@/lib/reports/schema";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    childId: string;
  };
};

// latest batch-generated report row for the child, if the reporting job has run yet
const GENERATED_REPORT_SELECT =
  "narrative_text, cycle_start, cycle_end, wcpm, wcpm_delta, accuracy_pct, top_deficits, generated_at";

type GeneratedReportRow = {
  narrative_text: string;
  cycle_start: string;
  cycle_end: string;
  wcpm: number | null;
  wcpm_delta: number | null;
  accuracy_pct: number | null;
  top_deficits: unknown;
  generated_at: string;
};

// live rollup from public.child_phonics_deficits, used when no report has been generated yet
type PhonicsDeficitRow = {
  phonics_category: string;
  miscue_count: number;
  avg_similarity: number | null;
};

const LIVE_DEFICIT_LIMIT = 5;

export async function GET(_request: NextRequest, { params }: RouteContext) {
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
    .limit(1)
    .maybeSingle<GeneratedReportRow>();

  if (reportError) {
    console.error("Failed to fetch generated report.", reportError);

    return errorResponse("internal_error", "Unable to load the report.", 500);
  }

  // the reporting job may not have produced a report yet, so fall back to a live
  // rollup of recent miscues straight from the deficits view
  const deficits = report
    ? normalizeStoredDeficits(report.top_deficits)
    : await fetchLiveDeficits(supabase, childId);

  if (deficits.error) {
    console.error("Failed to fetch phonics deficits.", deficits.error);

    return errorResponse("internal_error", "Unable to load the report.", 500);
  }

  return NextResponse.json({
    data: {
      childId,
      generatedAt: report?.generated_at ?? null,
      cycleStart: report?.cycle_start ?? null,
      cycleEnd: report?.cycle_end ?? null,
      wcpm: report?.wcpm ?? null,
      wcpmDelta: report?.wcpm_delta ?? null,
      accuracyPct: report?.accuracy_pct ?? null,
      deficits: deficits.data,
      narrativeText: report?.narrative_text ?? null
    }
  });
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
    data: data.map((row) => ({
      phonicsCategory: row.phonics_category,
      miscueCount: row.miscue_count,
      avgSimilarity: row.avg_similarity
    })),
    error: null
  };
}

// top_deficits is stored as loose jsonb by the reporting job, so read it defensively
// instead of assuming a fixed shape
function normalizeStoredDeficits(rawDeficits: unknown): {
  data: ChildReportDeficit[];
  error: null;
} {
  if (!Array.isArray(rawDeficits)) {
    return { data: [], error: null };
  }

  const deficits = rawDeficits
    .map((entry) => toDeficit(entry))
    .filter((entry): entry is ChildReportDeficit => entry !== null);

  return { data: deficits, error: null };
}

function toDeficit(entry: unknown): ChildReportDeficit | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const record = entry as Record<string, unknown>;
  const phonicsCategory = record.phonicsCategory ?? record.phonics_category ?? record.category;
  const miscueCount = record.miscueCount ?? record.miscue_count ?? record.count;
  const avgSimilarity = record.avgSimilarity ?? record.avg_similarity ?? null;

  if (typeof phonicsCategory !== "string" || typeof miscueCount !== "number") {
    return null;
  }

  return {
    phonicsCategory,
    miscueCount,
    avgSimilarity: typeof avgSimilarity === "number" ? avgSimilarity : null
  };
}
