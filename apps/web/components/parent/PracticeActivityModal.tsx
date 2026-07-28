"use client";

import { useEffect } from "react";
import {
  BookOpen,
  Clock,
  Cookie,
  CreditCard,
  Download,
  Eye,
  FileText,
  Hand,
  Home,
  Lamp,
  Package,
  Printer,
  Soup,
  Square,
  Tag,
  UtensilsCrossed,
  X
} from "lucide-react";
import type { PracticeRecommendation } from "@/lib/practice/schema";
import { formatPhonicsCategory } from "@/lib/phonics/format";

// ticket: integrate playful practice recommendations into parent dashboard
// maps the small set of icon keywords stored in activity_recommendations.materials
// to a concrete lucide icon; anything unrecognized falls back to a generic icon
// so new materials never break rendering
const MATERIAL_ICONS: Record<string, typeof Lamp> = {
  lamp: Lamp,
  wall: Square,
  hand: Hand,
  sheet: FileText,
  dough: Cookie,
  board: Square,
  card: CreditCard,
  bowl: Soup,
  spoon: UtensilsCrossed,
  book: BookOpen,
  tape: Tag,
  home: Home,
  eye: Eye
};

function MaterialIcon({ icon }: { icon: string }) {
  const Icon = MATERIAL_ICONS[icon] ?? Package;
  return <Icon className="h-4 w-4 shrink-0 text-coral" />;
}

type PracticeActivityModalProps = {
  activity: PracticeRecommendation;
  childName?: string;
  onClose: () => void;
  onPrint: () => void;
};

// ticket: integrate playful practice recommendations into parent dashboard
// a scrollable pop-up (see max-h-[88vh] overflow-y-auto below) shown when a
// parent taps one of the Recommended Next Steps cards
export function PracticeActivityModal({
  activity,
  childName,
  onClose,
  onPrint
}: PracticeActivityModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const ruleLabel = formatPhonicsCategory(activity.phonicsCategory);
  const badgeText =
    ruleLabel
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .slice(0, 3)
      .toUpperCase() || "?";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 print:hidden"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${activity.title} activity details`}
      >
        <div className="sticky top-0 z-10 rounded-t-3xl bg-coral px-6 pb-6 pt-5 text-center text-white">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close activity details"
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/85">
            Recommended Activity{childName ? ` for ${childName}` : ""}
          </p>
          <h2 className="mx-8 mt-1.5 text-2xl font-extrabold leading-tight">{activity.title}</h2>
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-white/90">
            <Clock className="h-3.5 w-3.5" />
            {activity.durationMinutes} minutes
          </p>
        </div>

        <div className="space-y-6 px-6 py-6">
          {activity.materials.length > 0 ? (
            <section className="rounded-2xl bg-rose-50 p-5">
              <h3 className="text-sm font-bold text-slate-900">What you&apos;ll need</h3>
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {activity.materials.map((material) => (
                  <div
                    key={material.label}
                    className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm"
                  >
                    <MaterialIcon icon={material.icon} />
                    {material.label}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="flex gap-4 rounded-2xl bg-slate-50 p-5">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-slate-900 text-sm font-black text-slate-900">
              {badgeText}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">What this teaches</h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">
                The <strong className="text-slate-900">{ruleLabel}</strong> &mdash;{" "}
                {lowercaseFirst(activity.pedagogy)}
                {activity.exampleWords.length > 0 ? (
                  <>
                    {" "}
                    Practice words like{" "}
                    <strong className="text-slate-900">{activity.exampleWords.join(", ")}</strong>.
                  </>
                ) : null}
                {childName ? ` ${childName} is currently working on this!` : null}
              </p>
            </div>
          </section>

          {activity.steps.length > 0 ? (
            <section className="rounded-2xl bg-amber-50 p-5">
              <h3 className="text-sm font-bold text-[#c05621]">Step-by-step</h3>
              <ol className="mt-3 space-y-3">
                {activity.steps.map((step, index) => (
                  <li key={step.title} className="rounded-xl bg-white p-4 shadow-sm">
                    <p className="text-xs font-extrabold text-coral">{index + 1}.</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">{step.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>

        <div className="flex justify-center gap-3 px-6 pb-6 pt-2">
          <button
            type="button"
            onClick={() => downloadActivityAsText(activity)}
            className="inline-flex items-center gap-2 rounded-full bg-coral px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-coral/90"
          >
            <Download className="h-4 w-4" />
            Save
          </button>
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-2 rounded-full bg-coral px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-coral/90"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
        </div>
      </div>
    </div>
  );
}

function lowercaseFirst(value: string) {
  return value.length === 0 ? value : value.charAt(0).toLowerCase() + value.slice(1);
}

// ticket: integrate playful practice recommendations into parent dashboard
// lightweight client-only save: no backend persistence exists for "saved"
// activities yet, so this downloads a plain-text copy the parent can keep
function downloadActivityAsText(activity: PracticeRecommendation) {
  const lines = [
    activity.title,
    `${activity.durationMinutes} minutes`,
    "",
    "What you'll need:",
    ...activity.materials.map((material) => `- ${material.label}`),
    "",
    "What this teaches:",
    activity.pedagogy,
    "",
    "Step-by-step:",
    ...activity.steps.map((step, index) => `${index + 1}. ${step.title} - ${step.description}`)
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${activity.title.replace(/\s+/g, "-").toLowerCase()}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}
