type MetricCardProps = {
  label: string;
  value?: string;
  tone?: "child" | "parent";
};

export function MetricCard({ label, value = "—", tone = "parent" }: MetricCardProps) {
  const accent = tone === "child" ? "text-coral bg-coral/10" : "text-teal bg-teal/10";

  return (
    <div className="rounded-[var(--radius-card)] border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`mb-5 h-2 w-14 rounded-full ${accent}`} />
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="mt-3 text-3xl font-black text-navy">{value}</p>
    </div>
  );
}
