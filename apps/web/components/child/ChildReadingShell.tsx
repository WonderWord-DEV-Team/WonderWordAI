"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useChildSession } from "@/components/child/ChildSessionContext";
import { KaraokeText } from "@/components/child/KaraokeText";
import { ReadingRecorder } from "@/components/child/ReadingRecorder";
import { WorksheetCapture } from "@/components/worksheet/WorksheetCapture";
import { useCloseSession, useCreateSession, useOpenSessions, useSession } from "@/hooks/useSessions";
import { ApiError } from "@/lib/api/client";
import type { AuthContext } from "@/lib/auth/types";
import { normalizeKaraokeWord, type KaraokeTimeline } from "@/lib/karaoke/timeline";
import type { SessionAudioMiscue } from "@/lib/audio/schema";

type ChildReadingShellProps = {
  auth: AuthContext;
  routeSessionId: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ChildReadingShell({ auth, routeSessionId }: ChildReadingShellProps) {
  const router = useRouter();
  const {
    sessionId,
    setSessionId,
    childId,
    setChildId,
    worksheetText,
    worksheetStatus,
    setWorksheetStatus,
    setOcrResult,
    clearOcrResult
  } = useChildSession();
  const { data: openSessions } = useOpenSessions();
  const { mutateAsync: createSession } = useCreateSession();
  const { mutateAsync: closeSession, isPending: isClosingSession } = useCloseSession();
  const parsedRouteSessionId = uuidPattern.test(routeSessionId) ? routeSessionId : null;
  const sessionQuery = useSession(parsedRouteSessionId);
  const correctionActionRef = useRef<HTMLButtonElement | null>(null);

  const [karaokeTimeline, setKaraokeTimeline] = useState<KaraokeTimeline | null>(null);
  const [playbackState, setPlaybackState] = useState({
    activeIndex: -1,
    currentTime: 0,
    playbackCompleted: false
  });
  const [sessionMiscues, setSessionMiscues] = useState<SessionAudioMiscue[]>([]);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [showRescan, setShowRescan] = useState(false);
  const [sessionEndError, setSessionEndError] = useState<string | null>(null);

  const miscueWords = useMemo(
    () => new Set(sessionMiscues.map((m) => normalizeKaraokeWord(m.word))),
    [sessionMiscues]
  );
  const currentMiscue = sessionMiscues[0] ?? null;

  useEffect(() => {
    if (sessionId === routeSessionId) {
      return;
    }

    setSessionId(routeSessionId);
    clearOcrResult();
    setKaraokeTimeline(null);
    setPlaybackState({ activeIndex: -1, currentTime: 0, playbackCompleted: false });
    setSessionMiscues([]);
    setShowCorrectionModal(false);
  }, [clearOcrResult, routeSessionId, sessionId, setSessionId]);

  const ensureSession = async () => {
    if (uuidPattern.test(sessionId)) {
      return sessionId;
    }

    const match = openSessions?.find((session) => session.id === sessionId);
    if (match) {
      setChildId(match.childId);
      return sessionId;
    }

    const session = await createSession();
    setSessionId(session.id);
    setChildId(session.childId);
    return session.id;
  };

  const handleTranscriptionComplete = (result: { miscues: SessionAudioMiscue[] }) => {
    // Batch, end-of-session correction feedback (per product decision:
    // simpler than live per-word miscue detection).
    setSessionMiscues(result.miscues);
    if (result.miscues.length > 0) {
      setShowCorrectionModal(true);
    }
  };

  useEffect(() => {
    if (!showCorrectionModal) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowCorrectionModal(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.setTimeout(() => correctionActionRef.current?.focus(), 0);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showCorrectionModal]);

  const handleEndSession = async () => {
    setSessionEndError(null);

    if (!parsedRouteSessionId) {
      router.push("/child");
      return;
    }

    try {
      await closeSession(parsedRouteSessionId);
      clearOcrResult();
      router.push("/child");
    } catch {
      setSessionEndError("We could not close this reading session. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFAF5] text-[#2b2b2b] flex flex-col justify-between font-body">
      {/* ---------------------------------------------------------------- */}
      {/* Header                                                          */}
      {/* ---------------------------------------------------------------- */}
      <header className="border-b border-[#ecdfc9] bg-white">
        <div className="mx-auto flex max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="WonderWord AI" className="h-8 w-auto" />

          <nav className="absolute left-1/2 hidden -translate-x-1/2 gap-8 text-sm font-medium text-[#4a4a4a] md:flex">
            <a href="/child" className="hover:text-[#2b2b2b]">Home</a>
            <a href="#" className="hover:text-[#2b2b2b]">Story Library</a>
            <a href="#" className="hover:text-[#2b2b2b]">Store</a>
            <a href="#" className="hover:text-[#2b2b2b]">Diagnostics</a>
          </nav>

          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-4">
            <div className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-600">
              <span>⭐</span>
              1,240
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-300 to-pink-300" />
              <span className="hidden max-w-48 truncate text-sm font-medium sm:inline">{auth.email}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Main Content                                                    */}
      {/* ---------------------------------------------------------------- */}
      <main className="mx-auto w-full max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] px-6 py-16 flex-1 flex flex-col justify-center relative">
        <div className="w-full animate-fadeIn">
            <button
            type="button"
            onClick={handleEndSession}
            disabled={isClosingSession}
            className="mb-3 flex min-h-12 items-center gap-2 text-left text-lg font-bold font-body text-[#a3352b] transition hover:text-[#c03d32] disabled:cursor-wait disabled:opacity-70"
          >
            <LogOut className="h-5 w-5 transform rotate-180" /> End Session
          </button>
          {sessionEndError ? (
            <p role="alert" className="mb-4 rounded-[12px] border border-[#a3352b]/20 bg-[#fff2f2] px-4 py-3 text-sm font-bold text-[#a3352b]">
              {sessionEndError}
            </p>
          ) : null}

          <div className="mb-8">
            <h1 className="text-4xl font-extrabold text-[#2b2b2b] tracking-tight sm:text-5xl font-body">
              Reading Mode
            </h1>
            <p className="mt-2 text-lg text-[#8a8a8a] font-body">
              Tap &ldquo;Start reading&rdquo; when you&apos;re ready
            </p>
          </div>

          {!parsedRouteSessionId ? (
            <ReadingRecoveryState
              title="This reading session link is invalid."
              body="Return to child home and start a fresh worksheet scan."
            />
          ) : sessionQuery.isLoading ? (
            <ReadingRecoveryState
              title="Checking reading session..."
              body="We are making sure this session belongs to you."
            />
          ) : sessionQuery.isError ? (
            <ReadingRecoveryState
              title={getSessionErrorTitle(sessionQuery.error)}
              body="Return to child home and start a fresh worksheet scan."
            />
          ) : sessionQuery.data?.status === "closed" ? (
            <ReadingRecoveryState
              title="This reading session is already closed."
              body="Start a new session to keep reading."
            />
          ) : !worksheetText ? (
            <div className="rounded-[24px] border border-[#ecdfc9]/60 bg-white p-10 text-center shadow-sm">
              <p className="text-lg font-extrabold leading-8 text-[#2b2b2b]">
                Worksheet text is no longer available for this reading session.
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#6f6f6f]">
                Rescan worksheet or start a new reading session.
              </p>
                <a
                href="/child"
                className="mt-4 inline-block rounded-full bg-[#ff6868] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#ef5353]"
              >
                Go to Home
              </a>
            </div>
          ) : (
            <>
              {/* Story Text Card */}
              <div className="bg-white rounded-[24px] p-8 md:p-10 border border-[#ecdfc9]/60 shadow-sm relative mb-8">
                <span className="text-base font-extrabold text-[#8c584c] block mb-4 font-body">
                  Story Name
                </span>
                <KaraokeText
                  timeline={karaokeTimeline}
                  fallbackText={worksheetText}
                  activeIndex={playbackState.activeIndex}
                  currentTime={playbackState.currentTime}
                  playbackCompleted={playbackState.playbackCompleted}
                  miscueWords={miscueWords}
                />
              </div>

              {/* Real recording controls, driving mic + transcription + karaoke */}
              <div className="mb-8">
                <ReadingRecorder
                  sessionId={sessionId}
                  worksheetText={worksheetText}
                  ensureSession={ensureSession}
                  onTimelineChange={setKaraokeTimeline}
                  onPlaybackChange={setPlaybackState}
                  onTranscriptionComplete={handleTranscriptionComplete}
                />
              </div>

              {/* Rescan */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowRescan(true)}
                  className="text-sm font-black text-[#a3352b] underline decoration-dotted"
                >
                  Rescan worksheet
                </button>
              </div>

              {showRescan ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                  <div className="w-full max-w-lg rounded-[24px] bg-white p-6 shadow-2xl">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-xl font-black text-[#2b2b2b]">Rescan worksheet</h2>
                      <button
                        type="button"
                        onClick={() => setShowRescan(false)}
                        className="text-sm font-bold text-[#8a8a8a]"
                      >
                        Close
                      </button>
                    </div>
                    <WorksheetCapture
                      status={worksheetStatus}
                      onStatusChange={setWorksheetStatus}
                      ensureSession={ensureSession}
                      onOcrComplete={(result) => {
                        setKaraokeTimeline(null);
                        setPlaybackState({ activeIndex: -1, currentTime: 0, playbackCompleted: false });
                        setSessionMiscues([]);
                        setOcrResult(result);
                        setShowRescan(false);
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </>
          )}

          {/* Batch correction popup — shown after a completed reading pass with miscues */}
          {showCorrectionModal && currentMiscue ? (
            <>
              <div className="fixed inset-0 bg-black/40 z-40" />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="correction-title"
                className="fixed left-1/2 top-1/2 z-[48] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[24px] border border-[#ecdfc9] bg-[#f4f7f6] shadow-2xl sm:rounded-[36px]"
              >
                <div className="text-center w-full py-6 px-6 bg-[#fff2f2] border-b border-[#ecdfc9]/60 rounded-t-[34px]">
                  <h2 id="correction-title" className="text-[#a3352b] text-2xl font-extrabold font-body sm:text-3xl">
                    Oops, let&apos;s try that again!
                  </h2>
                  <p className="text-xs font-bold text-[#8a8a8a] mt-1.5 font-body">
                    You read a different word. No worries!
                  </p>
                </div>

                <div className="w-full px-6 pb-6 pt-4 flex flex-col items-center">
                  <div className="flex w-full flex-col justify-center gap-4 sm:flex-row sm:gap-6 mt-2">
                    <div className="flex min-w-0 flex-col items-center">
                      <span className="text-xs font-bold text-[#8a8a8a] mb-2 font-body">You said</span>
                      <span className="max-w-full break-words rounded-full border border-[#a3352b] bg-[#fbeceb] px-3 py-1 text-center text-xl font-black text-[#a3352b] font-body sm:text-2xl">
                        {currentMiscue.actualPhonemes || "—"}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-col items-center">
                      <span className="text-xs font-bold text-[#8a8a8a] mb-2 font-body">The word is</span>
                      <span className="max-w-full break-words rounded-full border border-[#10a84e] bg-[#ecfbf0] px-3 py-1 text-center text-xl font-black text-[#10a84e] font-body sm:text-2xl">
                        {currentMiscue.word}
                      </span>
                    </div>
                  </div>

                  <button
                    ref={correctionActionRef}
                    type="button"
                    onClick={() => {
                      setSessionMiscues((prev) => prev.slice(1));
                      if (sessionMiscues.length <= 1) {
                        setShowCorrectionModal(false);
                      }
                    }}
                    className="bg-black hover:bg-zinc-900 active:scale-95 text-white font-extrabold text-2xl font-body py-3 px-10 rounded-[12px] mt-6 shadow-md transition"
                  >
                    {sessionMiscues.length > 1 ? "Next →" : "Done"}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </main>

      {/* ---------------------------------------------------------------- */}
      {/* Footer                                                           */}
      {/* ---------------------------------------------------------------- */}
      <footer className="border-t border-[#f0e6d8] bg-white py-8">
        <div className="mx-auto flex max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] flex-col items-center justify-between gap-4 px-6 text-sm text-[#8a8a8a] md:flex-row">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="WonderWord AI" className="h-6 w-auto opacity-80" />
            <p className="ml-1">© 2026 WonderWord AI.</p>
          </div>
          <div className="flex gap-5">
            <a href="#" className="hover:text-[#2b2b2b]">Privacy</a>
            <a href="/terms" className="hover:text-[#2b2b2b]">Terms</a>
            <a href="#" className="hover:text-[#2b2b2b]">Support</a>
            <a href="#" className="hover:text-[#2b2b2b]">About Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ReadingRecoveryState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[24px] border border-[#ecdfc9]/60 bg-white p-10 text-center shadow-sm">
      <p className="text-lg font-extrabold leading-8 text-[#2b2b2b]">{title}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-[#6f6f6f]">{body}</p>
      <a
        href="/child"
        className="mt-4 inline-block rounded-full bg-[#ff6868] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#ef5353]"
      >
        Go to Home
      </a>
    </div>
  );
}

function getSessionErrorTitle(error: Error) {
  if (error instanceof ApiError && error.status === 404) {
    return "This reading session is not available.";
  }

  if (error instanceof ApiError && error.status === 401) {
    return "Please sign in again to continue reading.";
  }

  return "We could not open this reading session.";
}
