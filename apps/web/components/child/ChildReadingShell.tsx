"use client";

import { useCallback, useRef } from "react";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { useChildSession } from "@/components/child/ChildSessionContext";
import { BrandHeader } from "@/components/shared/BrandHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageContainer } from "@/components/shared/PageContainer";
import { PlaceholderCard } from "@/components/shared/PlaceholderCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { WorksheetCapture } from "@/components/worksheet/WorksheetCapture";
import { useCreateSession } from "@/hooks/useSessions";
import type { AuthContext } from "@/lib/auth/types";

type ChildReadingShellProps = {
  auth: AuthContext;
};

const sessionMetrics = ["Time", "Words read", "Accuracy"];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ChildReadingShell({ auth }: ChildReadingShellProps) {
  const {
    sessionId,
    setSessionId,
    worksheetText,
    imageKeywords,
    worksheetStatus,
    setWorksheetStatus,
    setOcrResult,
    clearOcrResult
  } = useChildSession();
  const sessionRequestRef = useRef<Promise<string> | null>(null);
  const { mutateAsync: createSession } = useCreateSession();
  const isDemoSession = sessionId === "demo-session";
  const isReadingReady = Boolean(worksheetText);

  const ensureOpenSession = useCallback(async () => {
    if (uuidPattern.test(sessionId)) {
      return sessionId;
    }

    if (sessionRequestRef.current) {
      return sessionRequestRef.current;
    }

    sessionRequestRef.current = createSession()
      .then((session) => {
        setSessionId(session.id);
        return session.id;
      })
      .finally(() => {
        sessionRequestRef.current = null;
      });

    return sessionRequestRef.current;
  }, [createSession, sessionId, setSessionId]);

  return (
    <main className="bg-[linear-gradient(180deg,rgb(255_249_241),rgb(255_240_226))]">
      <PageContainer className="py-6 sm:py-8">
        <BrandHeader variant="child" />

        <section className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-coral/20 bg-white/88 px-4 py-3 shadow-soft">
          <div className="min-w-0 text-sm leading-6 text-muted">
            <p className="truncate font-extrabold text-navy">{auth.email}</p>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-coral">
              {auth.role}
            </p>
          </div>
          <SignOutButton />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <div className="min-w-0">
            <StatusBadge tone="child">{isReadingReady ? "Ready to read" : "Worksheet scan"}</StatusBadge>
            <h1 className="mt-4 font-display text-4xl font-black leading-tight text-navy sm:text-5xl">
              Reading Session
            </h1>
            <p className="mt-3 break-words text-base leading-7 text-muted">
              Session ID: <span className="font-extrabold text-navy">{sessionId}</span>
            </p>
            {isDemoSession ? (
              <p className="mt-3 rounded-[var(--radius-card)] border border-coral/25 bg-coral/10 px-4 py-3 text-sm font-extrabold leading-6 text-navy">
                Development only: this child account is temporarily routed to demo-session until real reading sessions are connected.
              </p>
            ) : null}

            <div className="mt-6 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="worksheet-lines rounded-[var(--radius-card)] p-1">
                <WorksheetCapture
                  status={worksheetStatus}
                  onStatusChange={setWorksheetStatus}
                  ensureSession={ensureOpenSession}
                  onOcrComplete={setOcrResult}
                />
              </div>

              <PlaceholderCard title={isReadingReady ? "Reading text" : "Reading text preview"} className="min-h-[22rem] reading-ruler">
                {worksheetText ? (
                  <div className="rounded-[var(--radius-card)] bg-white/88 p-5">
                    <p className="whitespace-pre-wrap text-2xl font-extrabold leading-10 text-navy">
                      {worksheetText}
                    </p>

                    {imageKeywords.length > 0 ? (
                      <div className="mt-5 flex flex-wrap gap-2" aria-label="Image keywords">
                        {imageKeywords.map((keyword) => (
                          <span
                            key={keyword}
                            className="rounded-full border border-teal/25 bg-teal/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-teal"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={clearOcrResult}
                      className="mt-6 min-h-12 rounded-[var(--radius-card)] border border-coral/30 px-4 py-3 text-sm font-black text-coral transition hover:bg-coral/10"
                    >
                      Rescan worksheet
                    </button>
                  </div>
                ) : (
                  <div className="flex min-h-[17rem] items-center justify-center rounded-[var(--radius-card)] border border-coral/20 bg-white/76 p-6 text-center">
                    <p className="text-lg font-extrabold leading-8 text-navy">
                      Your reading text will appear here after the worksheet scan.
                    </p>
                  </div>
                )}
              </PlaceholderCard>
            </div>
          </div>

          <aside className="grid content-start gap-5">
            <section className="rounded-[var(--radius-card)] border border-coral/25 bg-white p-5 shadow-soft">
              <h2 className="text-lg font-black text-navy">Reading controls</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                {isReadingReady ? "The passage is ready when the reading tools are connected." : "Scan a worksheet to get ready."}
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
