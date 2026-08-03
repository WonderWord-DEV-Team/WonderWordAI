import {
  type ChildReport,
  type ChildReportActivityRecommendation,
  type ChildReportDeficit
} from "./schema";

export const GENERATED_REPORT_SELECT =
  "id, narrative_text, activity_recommendation, cycle_start, cycle_end, wcpm, wcpm_delta, accuracy_pct, top_deficits, generated_at";

export type GeneratedReportRow = {
  id: string;
  narrative_text: string;
  activity_recommendation: unknown;
  cycle_start: string;
  cycle_end: string;
  wcpm: number | null;
  wcpm_delta: number | null;
  accuracy_pct: number | null;
  top_deficits: unknown;
  generated_at: string;
};

export type PhonicsDeficitRow = {
  phonics_category: string;
  miscue_count: number;
  avg_similarity: number | null;
};

export function buildGeneratedChildReport(
  childId: string,
  report: GeneratedReportRow
): ChildReport {
  return {
    childId,
    source: "generated",
    reportId: report.id,
    generatedAt: report.generated_at,
    cycleStart: report.cycle_start,
    cycleEnd: report.cycle_end,
    wcpm: report.wcpm,
    wcpmDelta: report.wcpm_delta,
    accuracyPct: report.accuracy_pct,
    deficits: normalizeStoredDeficits(report.top_deficits),
    narrativeText: report.narrative_text,
    activityRecommendation: normalizeActivityRecommendation(report.activity_recommendation)
  };
}

export function buildFallbackChildReport(
  childId: string,
  deficits: ChildReportDeficit[]
): ChildReport {
  return {
    childId,
    source: deficits.length > 0 ? "live" : "empty",
    reportId: null,
    generatedAt: null,
    cycleStart: null,
    cycleEnd: null,
    wcpm: null,
    wcpmDelta: null,
    accuracyPct: null,
    deficits,
    narrativeText: null,
    activityRecommendation: null
  };
}

export function toLiveDeficits(rows: PhonicsDeficitRow[]): ChildReportDeficit[] {
  return rows.map((row) => ({
    phonicsCategory: row.phonics_category,
    miscueCount: row.miscue_count,
    avgSimilarity: row.avg_similarity
  }));
}

// top_deficits is stored as loose jsonb by the reporting job, so read it
// defensively instead of assuming a fixed historical shape.
export function normalizeStoredDeficits(rawDeficits: unknown): ChildReportDeficit[] {
  if (!Array.isArray(rawDeficits)) {
    return [];
  }

  return rawDeficits
    .map((entry) => toDeficit(entry))
    .filter((entry): entry is ChildReportDeficit => entry !== null);
}

function toDeficit(entry: unknown): ChildReportDeficit | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const record = entry as Record<string, unknown>;
  const phonicsCategory = record.phonicsCategory ?? record.phonics_category ?? record.category;
  const miscueCount = record.miscueCount ?? record.miscue_count ?? record.count;
  const avgSimilarity = record.avgSimilarity ?? record.avg_similarity ?? null;

  if (
    typeof phonicsCategory !== "string" ||
    typeof miscueCount !== "number" ||
    !Number.isInteger(miscueCount) ||
    miscueCount < 0
  ) {
    return null;
  }

  return {
    phonicsCategory,
    miscueCount,
    avgSimilarity: typeof avgSimilarity === "number" ? avgSimilarity : null
  };
}

function normalizeActivityRecommendation(
  rawRecommendation: unknown
): ChildReportActivityRecommendation[] | null {
  if (!Array.isArray(rawRecommendation)) {
    return null;
  }

  const recommendations = rawRecommendation
    .map((entry) => toActivityRecommendation(entry))
    .filter(
      (entry): entry is ChildReportActivityRecommendation => entry !== null
    );

  return recommendations.length > 0 ? recommendations : null;
}

function toActivityRecommendation(
  entry: unknown
): ChildReportActivityRecommendation | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const record = entry as Record<string, unknown>;
  const phonicsCategory = record.phonicsCategory ?? record.phonics_category;
  const recommendation = record.recommendation ?? null;

  if (
    typeof record.title !== "string" ||
    typeof record.description !== "string" ||
    typeof record.pedagogy !== "string" ||
    typeof phonicsCategory !== "string"
  ) {
    return null;
  }

  return {
    title: record.title,
    description: record.description,
    pedagogy: record.pedagogy,
    phonicsCategory,
    recommendation: typeof recommendation === "string" ? recommendation : null
  };
}
