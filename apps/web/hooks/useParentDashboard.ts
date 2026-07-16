"use client";

import { useQuery } from "@tanstack/react-query";
import { getParentDashboard } from "@/lib/parent/client";
import type { ParentDashboardPeriod } from "@/lib/parent/dashboard";
import { parentDashboardQueryKeys } from "@/lib/parent/keys";

const PARENT_DASHBOARD_STALE_TIME_MS = 60_000;

export function useParentDashboard(period?: ParentDashboardPeriod) {
  return useQuery({
    queryKey: parentDashboardQueryKeys.dashboard(period),
    queryFn: () => getParentDashboard(period),
    staleTime: PARENT_DASHBOARD_STALE_TIME_MS
  });
}
