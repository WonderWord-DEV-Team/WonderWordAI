import { apiFetchJson } from "@/lib/api/client";
import { childReportResponseSchema } from "@/lib/reports/schema";

// ticket: wire parent dashboard to /api/reports/[childId] (wpm, accuracy, deficits)
export async function getChildReport(childId: string) {
  const payload = await apiFetchJson<unknown>(`/api/reports/${encodeURIComponent(childId)}`);

  return childReportResponseSchema.parse(payload).data;
}
