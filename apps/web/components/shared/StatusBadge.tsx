import type { ReactNode } from "react";

type StatusBadgeProps = {
  children: ReactNode;
  tone?: "child" | "parent" | "neutral";
};

const toneStyles = {
  child: "border-coral/30 bg-coral/10 text-coral",
  parent: "border-teal/30 bg-teal/10 text-teal",
  neutral: "border-navy/20 bg-white text-navy"
};

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-black uppercase tracking-[0.14em] ${toneStyles[tone]}`}
    >
      {children}
    </span>
  );
}
