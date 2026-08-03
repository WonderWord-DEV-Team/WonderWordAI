import { describe, expect, it } from "vitest";
import {
  buildFallbackChildReport,
  buildGeneratedChildReport,
  toLiveDeficits,
  type GeneratedReportRow
} from "./contract";
import { childReportResponseSchema } from "./schema";

const CHILD_ID = "11111111-1111-4111-8111-111111111111";

describe("child report response contract", () => {
  it("maps the latest generated_reports row into the browser contract", () => {
    const report: GeneratedReportRow = {
      id: "99999999-9999-4999-8999-999999999999",
      narrative_text: "Child One practiced SH sounds.",
      activity_recommendation: [
        {
          title: "Sound Hunt",
          description: "Find SH words around the house.",
          pedagogy: "Reinforces phonics recognition.",
          phonics_category: "sh-digraph",
          recommendation: "Try this twice this week."
        }
      ],
      cycle_start: "2026-07-01T00:00:00.000Z",
      cycle_end: "2026-07-07T00:00:00.000Z",
      wcpm: 45,
      wcpm_delta: 5,
      accuracy_pct: 88.5,
      top_deficits: [
        {
          phonicsCategory: "sh-digraph",
          miscueCount: 4,
          avgSimilarity: 0.72
        },
        {
          category: "ignored-negative-count",
          count: -1
        }
      ],
      generated_at: "2026-07-07T12:00:00.000Z"
    };

    const payload = {
      data: buildGeneratedChildReport(CHILD_ID, report)
    };

    expect(childReportResponseSchema.parse(payload)).toEqual({
      data: {
        childId: CHILD_ID,
        source: "generated",
        reportId: "99999999-9999-4999-8999-999999999999",
        generatedAt: "2026-07-07T12:00:00.000Z",
        cycleStart: "2026-07-01T00:00:00.000Z",
        cycleEnd: "2026-07-07T00:00:00.000Z",
        wcpm: 45,
        wcpmDelta: 5,
        accuracyPct: 88.5,
        deficits: [
          {
            phonicsCategory: "sh-digraph",
            miscueCount: 4,
            avgSimilarity: 0.72
          }
        ],
        narrativeText: "Child One practiced SH sounds.",
        activityRecommendation: [
          {
            title: "Sound Hunt",
            description: "Find SH words around the house.",
            pedagogy: "Reinforces phonics recognition.",
            phonicsCategory: "sh-digraph",
            recommendation: "Try this twice this week."
          }
        ]
      }
    });
  });

  it("labels no-report deficits from child_phonics_deficits as a live fallback", () => {
    const deficits = toLiveDeficits([
      {
        phonics_category: "short-a",
        miscue_count: 3,
        avg_similarity: 0.61
      }
    ]);

    expect(buildFallbackChildReport(CHILD_ID, deficits)).toMatchObject({
      childId: CHILD_ID,
      source: "live",
      reportId: null,
      deficits,
      narrativeText: null,
      activityRecommendation: null
    });
  });

  it("labels a no-report response with no live deficits as empty", () => {
    expect(buildFallbackChildReport(CHILD_ID, [])).toMatchObject({
      childId: CHILD_ID,
      source: "empty",
      reportId: null,
      deficits: [],
      generatedAt: null,
      cycleStart: null,
      cycleEnd: null,
      wcpm: null,
      wcpmDelta: null,
      accuracyPct: null,
      narrativeText: null,
      activityRecommendation: null
    });
  });
});
