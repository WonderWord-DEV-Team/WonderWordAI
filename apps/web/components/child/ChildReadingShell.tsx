import { BrandHeader } from "@/components/shared/BrandHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageContainer } from "@/components/shared/PageContainer";
import { PlaceholderCard } from "@/components/shared/PlaceholderCard";
import { StatusBadge } from "@/components/shared/StatusBadge";

type ChildReadingShellProps = {
  sessionId: string;
};

const sessionMetrics = ["Time", "Words read", "Accuracy"];

export function ChildReadingShell({ sessionId }: ChildReadingShellProps) {
  return (
    <main className="bg-[linear-gradient(180deg,rgb(255_249_241),rgb(255_240_226))]">
      <PageContainer className="py-6 sm:py-8">
        <BrandHeader variant="child" />

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <div className="min-w-0">
            <StatusBadge tone="child">Demo shell</StatusBadge>
            <h1 className="mt-4 font-display text-4xl font-black leading-tight text-navy sm:text-5xl">
              Reading Session
            </h1>
            <p className="mt-3 break-words text-base leading-7 text-muted">
              Session ID: <span className="font-extrabold text-navy">{sessionId}</span>
            </p>

            <div className="mt-6 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
              <PlaceholderCard title="Worksheet placeholder" className="min-h-[22rem] worksheet-lines">
                <div className="flex min-h-[17rem] items-center justify-center rounded-[var(--radius-card)] border border-coral/20 bg-white/76 p-6 text-center">
                  <p>
                    Worksheet pages and reading prompts will appear here after
                    document integration.
                  </p>
                </div>
              </PlaceholderCard>

              <PlaceholderCard title="Reading text placeholder" className="min-h-[22rem] reading-ruler">
                <div className="space-y-4 rounded-[var(--radius-card)] bg-white/78 p-5">
                  <p className="text-lg font-extrabold leading-8 text-navy">
                    A story passage will be shown here for the child to read.
                  </p>
                  <p>
                    Text, highlighting, pronunciation feedback, and live reading
                    support are intentionally not connected in this shell.
                  </p>
                </div>
              </PlaceholderCard>
            </div>
          </div>

          <aside className="grid content-start gap-5">
            <section className="rounded-[var(--radius-card)] border border-coral/25 bg-white p-5 shadow-soft">
              <h2 className="text-lg font-black text-navy">Reading controls</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Microphone and reading capture are coming soon.
              </p>
              <button
                type="button"
                disabled
                className="mt-5 min-h-14 w-full cursor-not-allowed rounded-[var(--radius-card)] bg-slate-200 px-5 text-base font-black text-slate-500"
              >
                Start reading
              </button>
              <button
                type="button"
                disabled
                className="mt-3 min-h-12 w-full cursor-not-allowed rounded-[var(--radius-card)] border border-slate-200 px-5 text-sm font-extrabold text-slate-500"
              >
                End Session
              </button>
            </section>

            <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {sessionMetrics.map((metric) => (
                <MetricCard key={metric} label={metric} tone="child" />
              ))}
            </section>
          </aside>
        </section>
      </PageContainer>
    </main>
  );
}
