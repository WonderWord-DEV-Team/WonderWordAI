import {
  parentDashboardPeriodSchema,
  type ParentDashboardPeriod
} from "@/lib/parent/dashboard";

export function normalizeParentDashboardPeriod(period?: ParentDashboardPeriod) {
  return parentDashboardPeriodSchema.parse(period ?? "30d");
}

export const parentDashboardQueryKeys = {
  all: ["parentDashboard"] as const,
  dashboard: (period?: ParentDashboardPeriod) =>
    [
      ...parentDashboardQueryKeys.all,
      { period: normalizeParentDashboardPeriod(period) }
    ] as const
};
