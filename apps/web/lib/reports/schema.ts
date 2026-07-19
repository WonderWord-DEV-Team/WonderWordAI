import { z } from "zod";

// ticket: wire parent dashboard to /api/reports/[childId] (wpm, accuracy, deficits)
export const reportChildIdParamSchema = z.string().uuid();

const reportDeficitSchema = z.object({
  phonicsCategory: z.string(),
  miscueCount: z.number().int().nonnegative(),
  avgSimilarity: z.number().nullable()
});

export const childReportResponseSchema = z.object({
  data: z.object({
    childId: z.string().uuid(),
    generatedAt: z.string().nullable(),
    cycleStart: z.string().nullable(),
    cycleEnd: z.string().nullable(),
    wcpm: z.number().int().nullable(),
    wcpmDelta: z.number().int().nullable(),
    accuracyPct: z.number().nullable(),
    deficits: z.array(reportDeficitSchema),
    narrativeText: z.string().nullable()
  })
});

export type ChildReportDeficit = z.infer<typeof reportDeficitSchema>;
export type ChildReportResponse = z.infer<typeof childReportResponseSchema>;
export type ChildReport = ChildReportResponse["data"];
