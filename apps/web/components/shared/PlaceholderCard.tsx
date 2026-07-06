import type { ReactNode } from "react";

type PlaceholderCardProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

export function PlaceholderCard({
  title,
  children,
  className = ""
}: PlaceholderCardProps) {
  return (
    <section
      className={`rounded-[var(--radius-card)] border border-dashed border-slate-300 bg-white/84 p-5 shadow-sm ${className}`}
    >
      <h2 className="text-base font-black text-navy">{title}</h2>
      <div className="mt-4 text-sm leading-6 text-muted">{children}</div>
    </section>
  );
}
