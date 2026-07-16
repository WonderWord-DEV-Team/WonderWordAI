"use client";

import { useEffect, useMemo, useState } from "react";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { useParentDashboard } from "@/hooks/useParentDashboard";
import type { AuthContext } from "@/lib/auth/types";
import {
  type ParentDashboardChild,
  type ParentDashboardPeriod,
  type ParentDashboardRecentSession
} from "@/lib/parent/dashboard";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip
} from "recharts";
import { AlertTriangle, BookOpen, CalendarDays, Lightbulb, Rocket } from "lucide-react";

const PERIOD_OPTIONS: { label: string; value: ParentDashboardPeriod }[] = [
  { label: "7 days", value: "7d" },
  { label: "14 days", value: "14d" },
  { label: "30 days", value: "30d" },
  { label: "All", value: "all" }
];

function StatCard({
  label,
  value,
  note
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-2xl bg-[#F5A65B] px-5 py-4 text-white shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/80">{label}</p>
      <p className="mt-1 text-3xl font-bold leading-tight">{value}</p>
      {note ? <p className="mt-1 text-xs text-white/85">{note}</p> : null}
    </div>
  );
}

function SummaryPanel({ child }: { child: ParentDashboardChild }) {
  const { metrics } = child;
  const latestSession = metrics.latestSessionAt
    ? `Latest session: ${formatDateTime(metrics.latestSessionAt)}`
    : "No completed session activity in this period.";
  const accuracy = formatAccuracy(metrics.accuracyPct);

  return (
    <div className="rounded-2xl border-2 border-dashed border-rose-300/70 bg-white p-5">
      <div className="mb-3 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 fill-amber-400 text-amber-400" />
        <h3 className="text-sm font-bold text-slate-900">Summary</h3>
      </div>
      <ul className="space-y-2.5">
        <li className="flex gap-2 text-[13px] leading-snug text-slate-600">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
          <span>{latestSession}</span>
        </li>
        <li className="flex gap-2 text-[13px] leading-snug text-slate-600">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
          <span>
            {child.name} has read {metrics.totalWords.toLocaleString()} words with {accuracy} accuracy.
          </span>
        </li>
      </ul>
    </div>
  );
}

function DashboardMessage({
  title,
  description,
  tone = "neutral"
}: {
  title: string;
  description: string;
  tone?: "neutral" | "error";
}) {
  const Icon = tone === "error" ? AlertTriangle : BookOpen;

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-rose-50 text-rose-500">
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-xl font-extrabold text-slate-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{description}</p>
    </section>
  );
}

function RecentSessionsList({ sessions }: { sessions: ParentDashboardRecentSession[] }) {
  if (sessions.length === 0) {
    return (
      <DashboardMessage
        title="No sessions in this period"
        description="When linked children complete reading sessions, the newest sessions will appear here."
      />
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-bold text-slate-900">Recent Sessions</h3>
      </div>
      <ul className="divide-y divide-slate-100">
        {sessions.map((session) => (
          <li key={session.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
            <div>
              <p className="text-sm font-bold text-slate-900">{formatDateTime(session.startTime)}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {session.status}
              </p>
            </div>
            <p className="text-sm font-semibold text-slate-600">
              {session.totalWords.toLocaleString()} words
            </p>
            <p className="text-sm font-semibold text-slate-600">
              {formatSessionAccuracy(session)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

type ParentDashboardShellProps = {
  auth: AuthContext;
};

export function ParentDashboardShell({ auth }: ParentDashboardShellProps) {
  const [period, setPeriod] = useState<ParentDashboardPeriod>("30d");
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const dashboardQuery = useParentDashboard(period);
  const dashboardChildren = dashboardQuery.data?.children;
  const children = useMemo(() => dashboardChildren ?? [], [dashboardChildren]);

  useEffect(() => {
    if (children.length === 0) {
      setActiveChildId(null);
      return;
    }

    if (!children.some((child) => child.id === activeChildId)) {
      setActiveChildId(children[0].id);
    }
  }, [activeChildId, children]);

  const activeChild = children.find((child) => child.id === activeChildId) ?? children[0];
  const chartData = useMemo(
    () =>
      activeChild?.recentSessions
        .slice()
        .reverse()
        .map((session) => ({
          session: formatDate(session.startTime),
          words: session.totalWords
        })) ?? [],
    [activeChild]
  );

  return (
    <div className="min-h-screen bg-[#F4F1EA]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-1.5 text-lg font-bold text-rose-500">
            <Rocket className="h-5 w-5" />
            WonderWord AI
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-500 md:flex">
            <a href="#" className="hover:text-slate-900">Home</a>
            <a href="#" className="hover:text-slate-900">Story Library</a>
            <a href="#" className="hover:text-slate-900">Store</a>
            <a href="#" className="font-semibold text-rose-500">Diagnostics</a>
          </nav>
          <div className="flex items-center gap-4">
            <div className="hidden text-right text-xs leading-5 text-slate-500 sm:block">
              <p className="max-w-52 truncate font-bold text-slate-700">{auth.email}</p>
              <p className="font-extrabold uppercase tracking-[0.12em] text-rose-500">
                {auth.role}
              </p>
            </div>
            <SignOutButton />
            <div className="grid h-8 w-8 place-items-center rounded-full bg-rose-100 text-xs font-black text-rose-500">
              {auth.role.slice(0, 1)}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2 rounded-full bg-slate-100 p-1">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPeriod(option.value)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  option.value === period
                    ? "bg-rose-400 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
            <CalendarDays className="h-4 w-4" />
            {period === "all" ? "All sessions" : `Last ${period.replace("d", " days")}`}
          </span>
        </div>

        {dashboardQuery.isLoading ? (
          <DashboardMessage
            title="Loading dashboard"
            description="Reading session metrics are being loaded for your linked children."
          />
        ) : dashboardQuery.isError ? (
          <DashboardMessage
            title="Dashboard unavailable"
            description={
              dashboardQuery.error instanceof Error
                ? dashboardQuery.error.message
                : "Unable to load the parent dashboard."
            }
            tone="error"
          />
        ) : children.length === 0 ? (
          <DashboardMessage
            title="No linked children"
            description="This parent account does not have linked child profiles visible yet."
          />
        ) : activeChild ? (
          <>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <div className="flex rounded-full bg-slate-100 p-1">
                {children.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => setActiveChildId(child.id)}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                      child.id === activeChild.id
                        ? "bg-rose-400 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {child.name}
                  </button>
                ))}
              </div>
              <span className="text-sm text-slate-500">
                Viewing <span className="font-semibold text-rose-500">{activeChild.name}&apos;s</span> Dashboard
              </span>
            </div>

            <h1 className="mt-6 text-3xl font-extrabold text-slate-900">
              {activeChild.name}&apos;s Reading Journey
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {activeChild.metrics.latestSessionAt
                ? `Last session: ${formatDateTime(activeChild.metrics.latestSessionAt)}`
                : "No sessions in the selected period"}
            </p>

            <section className="mt-8">
              <h2 className="mb-4 text-lg font-bold text-slate-900">Progress Overview:</h2>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
                <div className="grid grid-cols-2 gap-4">
                  <StatCard
                    label="Sessions"
                    value={activeChild.metrics.sessionCount.toLocaleString()}
                    note={period === "all" ? "All visible sessions" : `In the last ${period.replace("d", " days")}`}
                  />
                  <StatCard
                    label="Words Read"
                    value={activeChild.metrics.totalWords.toLocaleString()}
                    note="From reading session totals"
                  />
                  <StatCard
                    label="Correct Words"
                    value={activeChild.metrics.correctWords.toLocaleString()}
                    note="From reading session totals"
                  />
                  <StatCard
                    label="Accuracy"
                    value={formatAccuracy(activeChild.metrics.accuracyPct)}
                    note="Correct words divided by total words"
                  />
                </div>
                <SummaryPanel child={activeChild} />
              </div>
            </section>

            <section className="mt-6 rounded-3xl bg-[#FBEBD3] p-6">
              <div className="rounded-2xl bg-[#F5C48A] p-5">
                <h3 className="mb-4 text-sm font-bold text-slate-900">Words Read by Recent Session</h3>
                {chartData.length > 0 ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.4)" />
                        <XAxis dataKey="session" tick={{ fontSize: 12, fill: "#5c4322" }} axisLine={false} tickLine={false} />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 12, fill: "#5c4322" }}
                          axisLine={false}
                          tickLine={false}
                          label={{ value: "Words", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#5c4322" } }}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: 12, border: "none", fontSize: 12 }}
                          formatter={(value: unknown) => {
                            const numValue = typeof value === "number" ? value : 0;
                            return [`${numValue.toLocaleString()} words`, "Words"];
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="words"
                          stroke="#ffffff"
                          strokeWidth={3}
                          dot={{ r: 5, fill: "#ffffff", stroke: "#E8695E", strokeWidth: 2 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="grid h-64 place-items-center rounded-2xl bg-white/50 p-6 text-center">
                    <p className="text-sm font-bold leading-6 text-slate-600">
                      No recent sessions to chart for this period.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <RecentSessionsList sessions={activeChild.recentSessions} />
          </>
        ) : null}
      </main>

      <footer className="mt-12 border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 text-sm text-slate-500 sm:flex-row sm:items-center">
          <div>
            <p className="font-bold text-rose-500">WonderWord AI</p>
            <p className="text-xs text-slate-400">© 2024 WonderWord AI.</p>
          </div>
          <div className="flex gap-6 text-xs">
            <a href="#" className="hover:text-slate-700">Privacy</a>
            <a href="#" className="hover:text-slate-700">Terms</a>
            <a href="#" className="hover:text-slate-700">Support</a>
            <a href="#" className="hover:text-slate-700">About Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function formatAccuracy(value: number | null) {
  return value === null ? "No data" : `${value}%`;
}

function formatSessionAccuracy(session: ParentDashboardRecentSession) {
  if (session.totalWords === 0) {
    return "No accuracy data";
  }

  return `${Number(((session.correctWords / session.totalWords) * 100).toFixed(1))}% accuracy`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}
