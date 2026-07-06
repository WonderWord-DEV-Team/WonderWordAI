import { BrandHeader } from "@/components/shared/BrandHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageContainer } from "@/components/shared/PageContainer";
import { PlaceholderCard } from "@/components/shared/PlaceholderCard";
import { StatusBadge } from "@/components/shared/StatusBadge";

const metrics = [
  "Reading speed",
  "Pronunciation accuracy",
  "Words read",
  "Activities completed"
];

export function ParentDashboardShell() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,rgb(244_251_251),rgb(255_252_246))]">
      <PageContainer className="py-6 sm:py-8">
        <BrandHeader variant="parent" />

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(260px,0.35fr)_minmax(0,1fr)]">
          <aside className="rounded-[var(--radius-card)] border border-teal/20 bg-white p-5 shadow-soft">
            <StatusBadge tone="parent">Data will appear after integration</StatusBadge>
            <h1 className="mt-5 font-display text-4xl font-black leading-tight text-navy">
              Dashboard
            </h1>
            <label htmlFor="child-selector" className="mt-7 block text-sm font-black text-navy">
              Child selector
            </label>
            <select
              id="child-selector"
              disabled
              className="mt-2 min-h-12 w-full cursor-not-allowed rounded-[var(--radius-card)] border border-slate-200 bg-slate-100 px-3 text-sm font-bold text-slate-500"
              defaultValue=""
            >
              <option value="">No child profiles yet</option>
            </select>
            <p className="mt-4 text-sm leading-6 text-muted">
              Profiles and progress data are intentionally absent from this
              shell.
            </p>
          </aside>

          <div className="min-w-0 space-y-5">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <MetricCard key={metric} label={metric} tone="parent" />
              ))}
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <PlaceholderCard title="Recent progress / report" className="parent-grid min-h-[18rem]">
                <div className="rounded-[var(--radius-card)] bg-white/82 p-4">
                  <p>
                    Reports, reading trends, and review notes will appear here
                    after dashboard data is connected.
                  </p>
                  <div className="mt-5 grid gap-3">
                    <div className="h-4 w-5/6 rounded-full bg-slate-200" />
                    <div className="h-4 w-3/5 rounded-full bg-slate-200" />
                    <div className="h-4 w-4/6 rounded-full bg-slate-200" />
                  </div>
                </div>
              </PlaceholderCard>

              <PlaceholderCard title="Reading activity placeholder" className="min-h-[18rem]">
                <div className="grid gap-3">
                  <div className="rounded-[var(--radius-card)] border border-slate-200 bg-slate-50 p-4">
                    Activity summaries will be listed here.
                  </div>
                  <div className="rounded-[var(--radius-card)] border border-slate-200 bg-slate-50 p-4">
                    No real activity has been generated.
                  </div>
                </div>
              </PlaceholderCard>
            </section>

            <PlaceholderCard title="Recommended playful-practice placeholder">
              Practice recommendations will be generated after reading sessions,
              parent profiles, and learning signals are integrated.
            </PlaceholderCard>
          </div>
        </section>
      </PageContainer>
    </main>
  );
}
