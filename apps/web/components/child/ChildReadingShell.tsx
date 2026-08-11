"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Volume2, Mic } from "lucide-react";
import { useChildSession } from "@/components/child/ChildSessionContext";
import CorrectionModal from "@/components/child/CorrectionModal";
import { KaraokeText } from "@/components/child/KaraokeText";
import { ReadingRecorder } from "@/components/child/ReadingRecorder";
import { WorksheetCapture } from "@/components/worksheet/WorksheetCapture";
import { useCreateSession, useOpenSessions, useSession } from "@/hooks/useSessions";
import { ApiError } from "@/lib/api/client";
import type { AuthContext } from "@/lib/auth/types";
import { normalizeKaraokeWord, type KaraokeTimeline } from "@/lib/karaoke/timeline";
import type { SessionAudioData, SessionAudioMiscue } from "@/lib/audio/schema";

type ChildReadingShellProps = {
  auth: AuthContext;
  childName: string;
  routeSessionId: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ChildReadingShell({ auth, childName, routeSessionId }: ChildReadingShellProps) {
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
    latestTranscription,
    setLatestTranscription,
    clearOcrResult
  } = useChildSession();
  const { data: openSessions } = useOpenSessions();
  const { mutateAsync: createSession } = useCreateSession();
  const parsedRouteSessionId = uuidPattern.test(routeSessionId) ? routeSessionId : null;
  const sessionQuery = useSession(parsedRouteSessionId);

  const [karaokeTimeline, setKaraokeTimeline] = useState<KaraokeTimeline | null>(null);
  const [playbackState, setPlaybackState] = useState({
    activeIndex: -1,
    currentTime: 0,
    playbackCompleted: false
  });
  const [sessionMiscues, setSessionMiscues] = useState<SessionAudioMiscue[]>([]);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [showRescan, setShowRescan] = useState(false);
  const [hasResults, setHasResults] = useState(false);

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

  const handleTranscriptionComplete = (result: SessionAudioData) => {
    // Batch, end-of-session correction feedback (per product decision:
    // simpler than live per-word miscue detection).
    //
    // The correction modal is deliberately NOT opened here. It used to pop
    // automatically whenever there were miscues, which covered the screen at
    // exactly the moment the child can play their recording back and see the
    // misread words highlighted in the passage. That playback is the point of
    // this screen, so the modal now waits for the child to ask for it via the
    // "Practice my words" button below.
    setLatestTranscription(result);
    setSessionMiscues(result.miscues);
    setHasResults(true);
  };

  // Called from the Practice tab (via CorrectionModal) when the child
  // pronounces a practice word correctly within the attempt cap. Removes
  // that word from both: sessionMiscues (drives the correction modal /
  // karaoke highlighting for the rest of THIS session) and
  // latestTranscription (what the results screen reads for its
  // correct/accuracy counts) -- otherwise a word mastered here would keep
  // counting as a miss on the results page even though the child just
  // demonstrated they can read it.
  const handleWordMastered = (word: string) => {
    const normalized = normalizeKaraokeWord(word);

    setSessionMiscues((prev) =>
      prev.filter((miscue) => normalizeKaraokeWord(miscue.word) !== normalized)
    );

    if (latestTranscription) {
      setLatestTranscription({
        ...latestTranscription,
        miscues: latestTranscription.miscues.filter(
          (miscue) => normalizeKaraokeWord(miscue.word) !== normalized
        )
      });
    }
  };

  const goToResults = () => {
    router.push(`/child/${sessionId}/results`);
  };

  return (
    <div className="min-h-screen bg-[#FDFAF5] text-[#2b2b2b] flex flex-col justify-between font-body">
      {/* ---------------------------------------------------------------- */}
      {/* Header                                                          */}
      {/* ---------------------------------------------------------------- */}
      <header className="border-b border-[#ecdfc9] bg-white">
        <div className="mx-auto flex max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] items-center justify-between px-6 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="WonderWord AI" className="h-8 w-auto" />

          <nav className="absolute left-1/2 hidden -translate-x-1/2 gap-8 text-sm font-medium text-[#4a4a4a] md:flex">
            <a href="/child" className="hover:text-[#2b2b2b]">Home</a>
            <a href="#" className="hover:text-[#2b2b2b]">Story Library</a>
            <a href="#" className="hover:text-[#2b2b2b]">Store</a>
            <a href="#" className="hover:text-[#2b2b2b]">Diagnostics</a>
          </nav>

          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-300 to-pink-300" />
            <span className="text-sm font-medium">{childName}</span>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Main Content                                                    */}
      {/* ---------------------------------------------------------------- */}
      <main className="mx-auto w-full max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] px-6 py-16 flex-1 flex flex-col justify-center relative">
        <div className="w-full animate-fadeIn">
            <a
            href="/child"
            className="flex items-center gap-2 text-[#a3352b] hover:text-[#c03d32] text-lg font-bold font-body mb-6 transition"
          >
            <LogOut className="h-5 w-5 transform rotate-180" /> End Session
          </a>

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

              {/* Once a reading pass finishes, let the child jump to their results */}
              {hasResults ? (
                <div className="flex flex-wrap justify-center gap-4 mb-4">
                  {sessionMiscues.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setShowCorrectionModal(true)}
                      className="rounded-full bg-[#ff6868] hover:bg-[#ef5353] px-8 py-3 text-base font-black text-white shadow-sm transition"
                    >
                      Practice my words ({sessionMiscues.length})
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={goToResults}
                    className="rounded-full bg-[#0F9C8E] hover:bg-[#0d8478] px-8 py-3 text-base font-black text-white shadow-sm transition"
                  >
                    See my results →
                  </button>
                </div>
              ) : null}

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
                        setHasResults(false);
                        setOcrResult(result);
                        setShowRescan(false);
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </>
          )}

          {/* Correction modal popup — opened on request via "Practice my words",
              never automatically, so it can't cover the playback the child
              uses to hear their recording and see the misread words. */}
          {showCorrectionModal && currentMiscue ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <CorrectionModal
                storyText={worksheetText ?? ""}
                miscues={sessionMiscues}
                childId={childId}
                onWordMastered={handleWordMastered}
                onDone={() => {
                  // Closing returns to the reading screen rather than jumping
                  // to results: the child chose to open this, so they may well
                  // want to replay their recording afterwards. "See my
                  // results" is still right there when they're ready.
                  setShowCorrectionModal(false);
                }}
              />
            </div>
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