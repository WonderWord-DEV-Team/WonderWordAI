"use client";

import { useQuery } from "@tanstack/react-query";
import { getChildReport } from "@/lib/reports/client";
import { childReportQueryKeys } from "@/lib/reports/keys";

const CHILD_REPORT_STALE_TIME_MS = 60_000;

// ticket: wire parent dashboard to /api/reports/[childId] (wpm, accuracy, deficits)
export function useChildReport(childId: string | null | undefined) {
  return useQuery({
    queryKey: childReportQueryKeys.detail(childId ?? ""),
    queryFn: () => getChildReport(childId as string),
    enabled: Boolean(childId),
    staleTime: CHILD_REPORT_STALE_TIME_MS
  });
}
