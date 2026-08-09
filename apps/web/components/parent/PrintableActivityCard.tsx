import { Rocket } from "lucide-react";
import type { PracticeRecommendation } from "@/lib/practice/schema";
import { formatPhonicsCategory } from "@/lib/phonics/format";

type PrintableActivityCardProps = {
  activity: PracticeRecommendation;
  childName?: string;
  className?: string;
};

// ticket: implement printable activity card layout (css @media print)
// this component is only ever visible through the print stylesheet in
// app/globals.css (see .print-activity-card); on screen it stays hidden.
export function PrintableActivityCard({
  activity,
  childName,
  className = ""
}: PrintableActivityCardProps) {
  return (
    <div className={`print-activity-card bg-white p-10 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="WonderWord AI" className="h-8 w-auto" />
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#a3352b]">
        Playful Practice
      </p>

      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        {childName ? `For ${childName} · ` : ""}
        Focus: {formatPhonicsCategory(activity.phonicsCategory)} · {activity.durationMinutes} minutes
      </p>

      <h1 className="mt-6 text-3xl font-extrabold text-slate-900">{activity.title}</h1>

      {activity.materials.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-500">
            What you&apos;ll need
          </h2>
          <ul className="mt-2 grid grid-cols-2 gap-1.5 text-sm text-slate-700">
            {activity.materials.map((material) => (
              <li key={material.label}>• {material.label}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-6 print-activity-card-break rounded-2xl border border-dashed border-slate-300 p-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-500">
          What this teaches
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {activity.pedagogy}
          {activity.exampleWords.length > 0
            ? ` Practice words like ${activity.exampleWords.join(", ")}.`
            : ""}
        </p>
      </section>

      {activity.steps.length > 0 ? (
        <section className="mt-6 print-activity-card-break">
          <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-500">
            Step-by-step
          </h2>
          <ol className="mt-2 space-y-2">
            {activity.steps.map((step, index) => (
              <li key={step.title} className="text-sm leading-6 text-slate-700">
                <span className="font-bold text-slate-900">
                  {index + 1}. {step.title}:
                </span>{" "}
                {step.description}
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <p className="mt-6 text-base leading-7 text-slate-700">{activity.description}</p>
      )}

      <div className="mt-8 flex items-center gap-3 text-sm text-slate-500">
        <span className="inline-block h-5 w-5 rounded border border-slate-400" />
        We practiced this together on: ______________________
      </div>

      <p className="mt-8 text-xs text-slate-400">
        Printed from WonderWord AI · wonderword.ai
      </p>
    </div>
  );
}
