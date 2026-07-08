"use client";

import { useState } from "react";
import Image from "next/image";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Lightbulb, Rocket } from "lucide-react";

//items below need to be swapped out for actual data (dummy data right now)
type ChildProfile = {
  id: string;
  name: string;
  avatarUrl?: string;
};

const CHILDREN: ChildProfile[] = [
  { id: "emma", name: "Emma" },
  { id: "leo", name: "Leo" },
];

const READING_SPEED_DATA = [
  { week: "Week 1", wpm: 46 },
  { week: "Week 2", wpm: 51 },
  { week: "Week 3", wpm: 47 },
  { week: "Week 4", wpm: 56 },
  { week: "Week 5", wpm: 65 },
];

const OVERVIEW_INSIGHTS = [
  "Emma hit her reading goal all 5 days this week — a new streak!",
  "Her speed jumped 7 WPM since last week, putting her ahead of grade level.",
  "SH and TH digraphs are her current focus area — see recommendations below.",
  "Accuracy is strong at 95% — most errors are on multisyllabic words.",
];

const TREND_INSIGHTS = [
  "Emma's been on a steady upward trend since Week 3 — great momentum.",
  "The small dip in Week 3 happened after a longer break between sessions.",
  "At this pace she'll hit 75 WPM by end of month — above Grade 2 target.",
];

const STRONG_SKILLS = ["Sight words", "Short vowels", "CVC words", "Letter blends (bl, cr)"];
const NEEDS_PRACTICE = ["Long vowel pairs (oa, ee)", "R-controlled vowels", "Silent e words"];
const FOCUS_AREA = ["SH digraph", "TH digraph", "Multisyllabic words"];

const FOCUS_THIS_WEEK = ["SH sounds (ship, fish, shell)", "TH sounds (this, that, with)", "2-syllable words (basket, napkin)"];
const NEXT_GOALS = ["Long vowel pairs (rain, boat)", "Vowel teams", "Reach 70 WPM (currently 65)"];

const NEXT_STEPS = [
  {
    title: "Shadow Puppet SH Game",
    description: 'Make hand shadows and say SH words as the puppet "speaks" — ship, shell, shout. Takes about 10 min.',
  },
  {
    title: "TH Tongue Tickler",
    description: 'Practice "th" sounds by reading silly tongue twisters together — the thick thorn, that thin thread.',
  },
  {
    title: "Syllable Clap Game",
    description: "Say a word, clap each syllable together. Try basket, pencil, dinner, monkey. Race to clap fastest.",
  },
];

//small presentation helpers:
function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-2xl bg-[#F5A65B] px-5 py-4 text-white shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/80">{label}</p>
      <p className="mt-1 text-3xl font-bold leading-tight">{value}</p>
      {note && <p className="mt-1 text-xs text-white/85">{note}</p>}
    </div>
  );
}

function InsightsPanel({ items }: { items: string[] }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-rose-300/70 bg-white p-5">
      <div className="mb-3 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 fill-amber-400 text-amber-400" />
        <h3 className="text-sm font-bold text-slate-900">Insights</h3>
      </div>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-[13px] leading-snug text-slate-600">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SkillColumn({
  title,
  dotColor,
  items,
}: {
  title: string;
  dotColor: string;
  items: string[];
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-[13px] text-slate-600">
            <span className="text-slate-400">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GoalCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl bg-[#F5A65B] p-5 text-white">
      <h3 className="mb-3 text-sm font-bold">{title}</h3>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-[13px] leading-snug text-white/95">
            <span className="mt-0.5 text-white/80">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NextStepCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl bg-[#E8695E] p-5 text-white">
      <h4 className="mb-2 text-[15px] font-bold leading-snug">{title}</h4>
      <p className="text-[13px] leading-snug text-white/90">{description}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main shell
// ---------------------------------------------------------------------------

export function ParentDashboardShell() {
  const [activeChildId, setActiveChildId] = useState(CHILDREN[0].id);
  const activeChild = CHILDREN.find((c) => c.id === activeChildId) ?? CHILDREN[0];

  return (
    <div className="min-h-screen bg-[#F4F1EA]">
      {/* Top nav */}
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
            <span className="flex items-center gap-1 text-sm font-semibold text-amber-500">
              🪙 1,240
            </span>
            <div className="h-8 w-8 overflow-hidden rounded-full bg-slate-200">
              <Image src="/avatar-placeholder.png" alt="Emma" width={32} height={32} className="h-full w-full object-cover" />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Child switcher */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex rounded-full bg-slate-100 p-1">
            {CHILDREN.map((child) => (
              <button
                key={child.id}
                onClick={() => setActiveChildId(child.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  child.id === activeChildId
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

        {/* Title */}
        <h1 className="text-3xl font-extrabold text-slate-900">{activeChild.name}&apos;s Reading Journey</h1>
        <p className="mt-1 text-sm text-slate-500">Week of Nov 4–10, 2025 · Last session: 2 hours ago</p>

        {/* Progress overview */}
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Progress Overview:</h2>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Reading Speed" value="65 WPM" note="↑ +7 from last week" />
              <StatCard label="Accuracy" value="95%" note="↑ +3% improvement" />
              <StatCard label="Sessions" value="5 this week" note="Goal: 5 sessions ✓ Complete" />
              <StatCard label="Words Read" value="1,240" note="↑ Best week yet!" />
            </div>
            <InsightsPanel items={OVERVIEW_INSIGHTS} />
          </div>
        </section>

        {/* Chart + trend insights */}
        <section className="mt-6 rounded-3xl bg-[#FBEBD3] p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
            <div className="rounded-2xl bg-[#F5C48A] p-5">
              <h3 className="mb-4 text-sm font-bold text-slate-900">Reading Speed Over Time</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={READING_SPEED_DATA} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.4)" />
                    <XAxis dataKey="week" tick={{ fontSize: 12, fill: "#5c4322" }} axisLine={false} tickLine={false} />
                    <YAxis
                      domain={[40, 100]}
                      ticks={[40, 60, 80, 100]}
                      tick={{ fontSize: 12, fill: "#5c4322" }}
                      axisLine={false}
                      tickLine={false}
                      label={{ value: "Words per minute", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#5c4322" } }}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "none", fontSize: 12 }}
                      formatter={(value: unknown) => {
                        const numValue = typeof value === 'number' ? value : 0;
                        return [$${numValue} WPM, "Speed"];
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="wpm"
                      stroke="#ffffff"
                      strokeWidth={3}
                      dot={{ r: 5, fill: "#ffffff", stroke: "#E8695E", strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <InsightsPanel items={TREND_INSIGHTS} />
          </div>
        </section>

        {/* Skill columns */}
        <section className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <SkillColumn title="Strong Skills" dotColor="bg-emerald-500" items={STRONG_SKILLS} />
          <SkillColumn title="Needs Practice" dotColor="bg-amber-400" items={NEEDS_PRACTICE} />
          <SkillColumn title="Focus Area" dotColor="bg-rose-500" items={FOCUS_AREA} />
        </section>

        {/* Goals */}
        <section className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <GoalCard title="Focus this week..." items={FOCUS_THIS_WEEK} />
          <GoalCard title="Next goal..." items={NEXT_GOALS} />
        </section>

        {/* Recommended next steps */}
        <section className="mt-8 rounded-3xl bg-[#F3E1DE] p-6">
          <h2 className="mb-5 text-xl font-extrabold text-slate-900">Recommended Next Steps:</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {NEXT_STEPS.map((step) => (
              <NextStepCard key={step.title} {...step} />
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
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

