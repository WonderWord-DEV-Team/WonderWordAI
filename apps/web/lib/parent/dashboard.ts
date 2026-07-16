import { z } from "zod";

export const parentDashboardPeriodSchema = z.enum(["7d", "14d", "30d", "all"]);

export const parentDashboardQuerySchema = z.object({
  period: parentDashboardPeriodSchema.default("30d")
});

const dashboardRecentSessionSchema = z.object({
  id: z.string().uuid(),
  startTime: z.string(),
  endTime: z.string().nullable(),
  status: z.enum(["open", "closed"]),
  totalWords: z.number().int().nonnegative(),
  correctWords: z.number().int().nonnegative()
});

const dashboardChildSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  recentSessions: z.array(dashboardRecentSessionSchema),
  metrics: z.object({
    sessionCount: z.number().int().nonnegative(),
    totalWords: z.number().int().nonnegative(),
    correctWords: z.number().int().nonnegative(),
    accuracyPct: z.number().nullable(),
    latestSessionAt: z.string().nullable()
  })
});

export const parentDashboardResponseSchema = z.object({
  data: z.object({
    period: parentDashboardPeriodSchema,
    children: z.array(dashboardChildSchema)
  })
});

export type ParentDashboardPeriod = z.infer<typeof parentDashboardPeriodSchema>;
export type ParentDashboardResponse = z.infer<typeof parentDashboardResponseSchema>;
export type ParentDashboardChild = ParentDashboardResponse["data"]["children"][number];
export type ParentDashboardRecentSession = ParentDashboardChild["recentSessions"][number];

export type DashboardChildProfile = {
  id: string;
  name: string;
};

export type DashboardSession = {
  id: string;
  childId: string;
  startTime: string;
  endTime: string | null;
  totalWords: number;
  correctWords: number;
};

const RECENT_SESSION_LIMIT = 5;

export function calculateAccuracyPct(totalWords: number, correctWords: number) {
  if (totalWords === 0) {
    return null;
  }

  return Number(((correctWords / totalWords) * 100).toFixed(1));
}

export function getPeriodStart(period: ParentDashboardPeriod, now = new Date()) {
  if (period === "all") {
    return null;
  }

  const days = Number(period.replace("d", ""));
  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - days);

  return periodStart;
}

export function buildParentDashboard({
  period,
  children,
  sessions
}: {
  period: ParentDashboardPeriod;
  children: DashboardChildProfile[];
  sessions: DashboardSession[];
}): ParentDashboardResponse {
  const sessionsByChild = new Map<string, DashboardSession[]>();

  for (const session of sessions) {
    const childSessions = sessionsByChild.get(session.childId) ?? [];
    childSessions.push(session);
    sessionsByChild.set(session.childId, childSessions);
  }

  return {
    data: {
      period,
      children: children.map((child) => {
        const childSessions = [...(sessionsByChild.get(child.id) ?? [])].sort(
          (a, b) => Date.parse(b.startTime) - Date.parse(a.startTime)
        );
        const totalWords = childSessions.reduce((sum, session) => sum + session.totalWords, 0);
        const correctWords = childSessions.reduce(
          (sum, session) => sum + session.correctWords,
          0
        );

        return {
          id: child.id,
          name: child.name,
          recentSessions: childSessions.slice(0, RECENT_SESSION_LIMIT).map((session) => ({
            id: session.id,
            startTime: session.startTime,
            endTime: session.endTime,
            status: session.endTime ? "closed" : "open",
            totalWords: session.totalWords,
            correctWords: session.correctWords
          })),
          metrics: {
            sessionCount: childSessions.length,
            totalWords,
            correctWords,
            accuracyPct: calculateAccuracyPct(totalWords, correctWords),
            latestSessionAt: childSessions[0]?.startTime ?? null
          }
        };
      })
    }
  };
}
