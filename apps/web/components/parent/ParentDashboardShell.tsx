"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { useChildReport } from "@/hooks/useChildReport";
import { useParentDashboard } from "@/hooks/useParentDashboard";
// ticket: integrate playful practice recommendations into parent dashboard
import { usePracticeRecommendation } from "@/hooks/usePracticeRecommendation";
import { PrintableActivityCard } from "@/components/parent/PrintableActivityCard";
import { PracticeActivityModal } from "@/components/parent/PracticeActivityModal";
import { formatPhonicsCategory } from "@/lib/phonics/format";
import type { AuthContext } from "@/lib/auth/types";
import {
  type ParentDashboardChild,
  type ParentDashboardPeriod,
  type ParentDashboardRecentSession
} from "@/lib/parent/dashboard";
import type { ChildReportDeficit } from "@/lib/reports/schema";
import type { PracticeRecommendation } from "@/lib/practice/schema";
import type { UseQueryResult } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip
} from "recharts";
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  Gauge,
  Lightbulb,
  Sparkles
} from "lucide-react";
import { signOut } from "@/app/auth/actions";

const PERIOD_OPTIONS: { label: string; value: ParentDashboardPeriod }[] = [
  { label: "7 days", value: "7d" },
  { label: "14 days", value: "14d" },
  { label: "30 days", value: "30d" },
  { label: "All", value: "all" }
];

// ticket: polish parent dashboard - reading speed trend + phonics deficit breakdown
// there's no dedicated "mastery" signal in the data model yet, so these
// foundational categories are treated as strong by default unless the child
// currently has a matching deficit for them
const FOUNDATIONAL_SKILLS = ["Sight words", "Short vowels", "CVC words", "Letter blends"];

function splitDeficitsBySeverity(deficits: ChildReportDeficit[]) {
  const sorted = [...deficits].sort((a, b) => b.miscueCount - a.miscueCount);
  const focusCount = sorted.length === 0 ? 0 : Math.max(1, Math.ceil(sorted.length / 2));

  return {
    focusArea: sorted.slice(0, focusCount),
    needsPractice: sorted.slice(focusCount)
  };
}

function deriveStrongSkills(deficits: ChildReportDeficit[]) {
  const deficitCategories = deficits.map((deficit) => deficit.phonicsCategory.toLowerCase());

  return FOUNDATIONAL_SKILLS.filter(
    (skill) => !deficitCategories.some((category) => category.includes(skill.toLowerCase()))
  );
}

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
        <h3 className="text-sm font-bold text-slate-900">Insights</h3>
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

// ticket: polish parent dashboard - reading speed trend + phonics deficit breakdown
function SkillColumn({
  dotClassName,
  title,
  items,
  emptyLabel
}: {
  dotClassName: string;
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${dotClassName}`} />
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-[13px] leading-snug text-slate-400">{emptyLabel}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item} className="text-[13px] leading-snug text-slate-600">
              • {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ticket: polish parent dashboard - reading speed trend + phonics deficit breakdown
function PhonicsBreakdown({
  isLoading,
  isError,
  deficits
}: {
  isLoading: boolean;
  isError: boolean;
  deficits: ChildReportDeficit[];
}) {
  const { focusArea, needsPractice } = useMemo(() => splitDeficitsBySeverity(deficits), [deficits]);
  const strongSkills = useMemo(() => deriveStrongSkills(deficits), [deficits]);

  return (
    <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
      {isLoading ? (
        <p className="text-sm text-slate-500">Loading phonics breakdown…</p>
      ) : isError ? (
        <p className="text-sm text-slate-500">Unable to load the phonics breakdown right now.</p>
      ) : (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <SkillColumn
            dotClassName="bg-emerald-500"
            title="Strong Skills"
            items={strongSkills}
            emptyLabel="Nothing flagged as strong yet."
          />
          <SkillColumn
            dotClassName="bg-amber-400"
            title="Needs Practice"
            items={needsPractice.map((deficit) => formatPhonicsCategory(deficit.phonicsCategory))}
            emptyLabel="No moderate focus areas right now."
          />
          <SkillColumn
            dotClassName="bg-rose-500"
            title="Focus Area"
            items={focusArea.map((deficit) => formatPhonicsCategory(deficit.phonicsCategory))}
            emptyLabel="No focus areas detected."
          />
        </div>
      )}
    </section>
  );
}

// ticket: integrate playful practice recommendations into parent dashboard
// the whole card is a button that opens the scrollable PracticeActivityModal
function PracticeCard({
  category,
  query,
  onOpen
}: {
  category: string;
  query: UseQueryResult<PracticeRecommendation>;
  onOpen: (category: string) => void;
}) {
  const canOpen = Boolean(query.data);

  return (
    <button
      type="button"
      onClick={() => canOpen && onOpen(category)}
      disabled={!canOpen}
      className="rounded-2xl bg-coral p-5 text-left text-white shadow-sm transition-transform enabled:hover:-translate-y-0.5 enabled:hover:shadow-md disabled:cursor-default"
    >
      {query.isLoading ? (
        <p className="text-sm font-semibold text-white/80">Finding an offline activity…</p>
      ) : query.isError || !query.data ? (
        <p className="text-sm font-semibold text-white/80">Unable to load this activity.</p>
      ) : (
        <>
          <h3 className="text-sm font-bold leading-snug">{query.data.title}</h3>
          <p className="mt-1.5 text-[13px] leading-snug text-white/90">{query.data.description}</p>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-white/75">
            Tap to see the full activity →
          </p>
        </>
      )}
    </button>
  );
}

// ticket: integrate playful practice recommendations into parent dashboard
function RecommendedNextSteps({
  isReady,
  categories,
  queries,
  onOpen
}: {
  isReady: boolean;
  categories: string[];
  queries: UseQueryResult<PracticeRecommendation>[];
  onOpen: (category: string) => void;
}) {
  if (!isReady) {
    return null;
  }

  if (categories.length === 0) {
    return (
      <section className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-coral" />
          <h2 className="text-lg font-bold text-slate-900">Recommended Next Steps:</h2>
        </div>
        <p className="text-sm text-slate-500">
          No focus areas detected recently — check back after more reading sessions.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-coral" />
        <h2 className="text-lg font-bold text-slate-900">Recommended Next Steps:</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {categories.map((category, index) => (
          <PracticeCard key={category} category={category} query={queries[index]} onOpen={onOpen} />
        ))}
      </div>
    </section>
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

// ticket: build basic reading session history list for parent dashboard
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
          <li key={session.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
            <div>
              <p className="text-sm font-bold text-slate-900">{formatDateTime(session.startTime)}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {session.status}
              </p>
            </div>
            <p className="text-sm font-semibold text-slate-600">{formatSessionDuration(session)}</p>
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
  // ticket: wire parent dashboard to /api/reports/[childId] (wpm, accuracy, deficits)
  const reportQuery = useChildReport(activeChildId);
  const deficits = useMemo(() => reportQuery.data?.deficits ?? [], [reportQuery.data]);

  // ticket: integrate playful practice recommendations into parent dashboard
  // recommend an activity for each of the top (highest-miscue) focus categories,
  // capped at 3 to match the "Recommended Next Steps" card row
  const { focusArea } = useMemo(() => splitDeficitsBySeverity(deficits), [deficits]);
  const topFocusCategories = useMemo(
    () => focusArea.slice(0, 3).map((deficit) => deficit.phonicsCategory),
    [focusArea]
  );
  // react query hooks must be called unconditionally, so these are three fixed
  // slots (disabled automatically by usePracticeRecommendation when null)
  const practiceQuery0 = usePracticeRecommendation(activeChildId, topFocusCategories[0] ?? null);
  const practiceQuery1 = usePracticeRecommendation(activeChildId, topFocusCategories[1] ?? null);
  const practiceQuery2 = usePracticeRecommendation(activeChildId, topFocusCategories[2] ?? null);
  const practiceQueries = [practiceQuery0, practiceQuery1, practiceQuery2].slice(
    0,
    topFocusCategories.length
  );

  // ticket: integrate playful practice recommendations into parent dashboard
  // tracks which Recommended Next Steps card is open in the scrollable modal
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const openIndex = openCategory ? topFocusCategories.indexOf(openCategory) : -1;
  const openActivity = openIndex >= 0 ? practiceQueries[openIndex]?.data : undefined;

  // ticket: implement printable activity card layout (css @media print)
  const [printingActivity, setPrintingActivity] = useState<PracticeRecommendation | null>(null);

  useEffect(() => {
    if (!printingActivity) {
      return;
    }

    window.print();

    const handleAfterPrint = () => setPrintingActivity(null);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, [printingActivity]);

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
  // ticket: polish parent dashboard - reading speed trend + phonics deficit breakdown
  // derived straight from recent session totals/duration, so the trend shows up
  // even before the batch reporting job has produced a generated_reports row
  const speedChartData = useMemo(
    () =>
      activeChild?.recentSessions
        .slice()
        .reverse()
        .map((session) => ({
          session: formatDate(session.startTime),
          wcpm: calculateSessionWcpm(session)
        }))
        .filter((point): point is { session: string; wcpm: number } => point.wcpm !== null) ?? [],
    [activeChild]
  );

  return (
    <div className="min-h-screen bg-[#F4F1EA]">
      {/* ticket: implement printable activity card layout (css @media print) */}
     <header className="border-b border-[#ecdfc9] bg-white print:hidden">
        <div className="mx-auto flex max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] items-center justify-between px-6 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="WonderWord AI" className="h-8 w-auto" />

          <nav className="absolute left-1/2 hidden -translate-x-1/2 gap-8 text-sm font-medium text-[#4a4a4a] md:flex">
            <a href="#" className="hover:text-[#2b2b2b]">Home</a>
            <a href="#" className="hover:text-[#2b2b2b]">Story Library</a>
            <a href="#" className="hover:text-[#2b2b2b]">Store</a>
            <a href="#" className="border-b-2 border-[#a3352b] pb-1 font-bold text-[#2b2b2b]">Diagnostics</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/profiles"
              className="rounded-full border border-[#ecdfc9] px-3 py-1.5 text-xs font-bold text-[#5a5a5a] transition hover:bg-[#faf7f2]"
            >
              Switch to Child
            </Link>

            <div className="hidden text-right text-xs leading-5 text-[#8a8a8a] sm:block">
              <p className="max-w-52 truncate font-bold text-[#2b2b2b]">{auth.email}</p>
              <p className="font-extrabold uppercase tracking-[0.12em] text-[#a3352b]">
                {auth.role}
              </p>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-full border border-[#ecdfc9] px-3 py-1.5 text-xs font-bold text-[#5a5a5a] transition hover:bg-[#faf7f2]"
              >
                Log Out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] px-6 py-8 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2 rounded-full bg-slate-100 p-1">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPeriod(option.value)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${option.value === period
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

        <section className="mt-6 rounded-2xl border border-rose-200 bg-[#FFF6EE] p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Word Tools</h2>
              <p className="mt-1 text-sm text-slate-600">
                Open the word explorer to look up meanings, practice new vocabulary, and keep reading fun.
              </p>
            </div>
            <Link
              href="/explorer"
              className="inline-flex items-center rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600"
            >
              Open Word Tools
            </Link>
          </div>
        </section>

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
                : "The dashboard data could not be loaded right now. Your account is still signed in, and you can try again shortly."
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
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${child.id === activeChild.id
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
                    label="Reading Speed"
                    value={formatWpm(reportQuery.data?.wcpm ?? null, reportQuery.isLoading)}
                    note={formatWpmDelta(reportQuery.data?.wcpmDelta ?? null)}
                  />
                  <StatCard
                    label="Accuracy"
                    value={formatAccuracy(activeChild.metrics.accuracyPct)}
                    note="Correct words divided by total words"
                  />
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
                </div>
                <div className="grid gap-6">
                  <SummaryPanel child={activeChild} />
                </div>
              </div>
            </section>

            {/* ticket: polish parent dashboard - reading speed trend + phonics deficit breakdown */}
            <section className="mt-6 rounded-3xl bg-[#FBEBD3] p-6">
              <div className="rounded-2xl bg-[#F5C48A] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-[#5c4322]" />
                  <h3 className="text-sm font-bold text-slate-900">Reading Speed Over Time</h3>
                </div>
                {speedChartData.length > 0 ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={speedChartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.4)" />
                        <XAxis dataKey="session" tick={{ fontSize: 12, fill: "#5c4322" }} axisLine={false} tickLine={false} />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 12, fill: "#5c4322" }}
                          axisLine={false}
                          tickLine={false}
                          label={{ value: "Words per minute", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#5c4322" } }}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: 12, border: "none", fontSize: 12 }}
                          formatter={(value: unknown) => {
                            const numValue = typeof value === "number" ? value : 0;
                            return [`${numValue.toLocaleString()} wcpm`, "Reading speed"];
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="wcpm"
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
                      No completed sessions with timing data to chart yet.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* ticket: polish parent dashboard - reading speed trend + phonics deficit breakdown */}
            {/* kept in the same orange family as the chart above so the page reads as one palette */}
            <section className="mt-6 rounded-3xl bg-[#FDE7CE] p-6">
              <div className="rounded-2xl bg-[#F7B979] p-5">
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

            {/* ticket: polish parent dashboard - reading speed trend + phonics deficit breakdown */}
            <PhonicsBreakdown
              isLoading={reportQuery.isLoading}
              isError={reportQuery.isError}
              deficits={deficits}
            />

            {/* ticket: integrate playful practice recommendations into parent dashboard */}
            <RecommendedNextSteps
              isReady={!reportQuery.isLoading && !reportQuery.isError}
              categories={topFocusCategories}
              queries={practiceQueries}
              onOpen={setOpenCategory}
            />

            <RecentSessionsList sessions={activeChild.recentSessions} />
          </>
        ) : null}
      </main>

      <footer className="mt-12 border-t border-[#f0e6d8] bg-white py-8 print:hidden">
        <div className="mx-auto flex max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] flex-col items-start justify-between gap-4 px-6 text-sm text-[#8a8a8a] sm:flex-row sm:items-center">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="WonderWord AI" className="h-6 w-auto opacity-80" />
            <p className="ml-1 mt-1 text-xs text-[#a8a8a8]">© 2026 WonderWord AI.</p>
          </div>
          <div className="flex gap-6 text-xs">
            <a href="/privacy" className="hover:text-[#2b2b2b]">Privacy</a>
            <a href="/terms" className="hover:text-[#2b2b2b]">Terms</a>
            <a href="/help" className="hover:text-[#2b2b2b]">Support</a>
            <a href="#" className="hover:text-[#2b2b2b]">About Us</a>
          </div>
        </div>
      </footer>

      {/* ticket: integrate playful practice recommendations into parent dashboard */}
      {openCategory && openActivity ? (
        <PracticeActivityModal
          activity={openActivity}
          childName={activeChild?.name}
          onClose={() => setOpenCategory(null)}
          onPrint={() => setPrintingActivity(openActivity)}
        />
      ) : null}

      {/* ticket: implement printable activity card layout (css @media print) */}
      {printingActivity ? (
        <PrintableActivityCard
          activity={printingActivity}
          childName={activeChild?.name}
          className="hidden print:block"
        />
      ) : null}
    </div>
  );
}

function formatAccuracy(value: number | null) {
  return value === null ? "No data" : `${value}%`;
}

// ticket: wire parent dashboard to /api/reports/[childId] (wpm, accuracy, deficits)
function formatWpm(value: number | null, isLoading: boolean) {
  if (isLoading) {
    return "…";
  }

  return value === null ? "No data" : `${value} wpm`;
}

function formatWpmDelta(value: number | null) {
  if (value === null) {
    return "No prior report to compare";
  }

  if (value === 0) {
    return "No change since last report";
  }

  return value > 0 ? `Up ${value} wpm since last report` : `Down ${Math.abs(value)} wpm since last report`;
}

function formatSessionAccuracy(session: ParentDashboardRecentSession) {
  if (session.totalWords === 0) {
    return "No accuracy data";
  }

  return `${Number(((session.correctWords / session.totalWords) * 100).toFixed(1))}% accuracy`;
}

// ticket: polish parent dashboard - reading speed trend + phonics deficit breakdown
// mirrors the wcpm (words correct per minute) terminology already used by the
// generated report, computed live from a single session's duration
function calculateSessionWcpm(session: ParentDashboardRecentSession): number | null {
  if (!session.endTime) {
    return null;
  }

  const durationMs = Date.parse(session.endTime) - Date.parse(session.startTime);
  const durationMinutes = durationMs / 60_000;

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return null;
  }

  return Math.round(session.correctWords / durationMinutes);
}

// ticket: build basic reading session history list for parent dashboard
function formatSessionDuration(session: ParentDashboardRecentSession) {
  if (!session.endTime) {
    return "In progress";
  }

  const durationMs = Date.parse(session.endTime) - Date.parse(session.startTime);

  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return "—";
  }

  const minutes = Math.max(1, Math.round(durationMs / 60_000));

  return `${minutes} min`;
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
