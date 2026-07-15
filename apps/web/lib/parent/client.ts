import { apiFetchJson } from "@/lib/api/client";
import {
  parentDashboardResponseSchema,
  type ParentDashboardPeriod
} from "@/lib/parent/dashboard";
import { normalizeParentDashboardPeriod } from "@/lib/parent/keys";

export async function getParentDashboard(period?: ParentDashboardPeriod) {
  const normalizedPeriod = normalizeParentDashboardPeriod(period);
  const params = new URLSearchParams({ period: normalizedPeriod });
  const payload = await apiFetchJson<unknown>(`/api/parent/dashboard?${params.toString()}`);

  return parentDashboardResponseSchema.parse(payload).data;
}
