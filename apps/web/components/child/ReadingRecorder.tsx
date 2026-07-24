"use client";

import { Pause, Play, RotateCcw, Square, Waves } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { uploadSessionAudio } from "@/lib/audio/browser-client";
import type { SessionAudioData, SessionAudioMiscue } from "@/lib/audio/schema";
import {
  buildKaraokeTimeline,
  chooseSupportedRecordingMimeType,
  getActiveKaraokeIndex,
  normalizeKaraokeWord,
  stopMediaStreamTracks,
  type KaraokeTimeline
} from "@/lib/karaoke/timeline";

export type RecordingState =
  | "idle"
  | "requesting_permission"
  | "recording"
  | "processing"
  | "ready_for_playback"
  | "playing"
  | "paused"
  | "completed"
  | "error";

type ReadingRecorderProps = {
  sessionId: string;
  worksheetText: string | null;
  ensureSession: () => Promise<string>;
  onTimelineChange: (timeline: KaraokeTimeline | null) => void;
  onPlaybackChange: (state: {
    activeIndex: number;
    currentTime: number;
    playbackCompleted: boolean;
  }) => void;
  onTranscriptionComplete: (result: SessionAudioData) => void;
};

const MAX_RECORDING_MS = 30_000;

export function ReadingRecorder({
  sessionId,
  worksheetText,
  ensureSession,
  onTimelineChange,
  onPlaybackChange,
  onTranscriptionComplete
}: ReadingRecorderProps) {
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const objectUrlRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordingLimitRef = useRef<number | null>(null);
  const playbackButtonRef = useRef<HTMLButtonElement | null>(null);
  const timelineRef = useRef<KaraokeTimeline | null>(null);
  const isMountedRef = useRef(true);
  const shouldSubmitRecordingRef = useRef(false);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [message, setMessage] = useState("Scan a worksheet, then press Start Reading.");
  const [activeSessionId, setActiveSessionId] = useState(sessionId);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [playbackCompleted, setPlaybackCompleted] = useState(false);
  const [miscues, setMiscues] = useState<SessionAudioMiscue[]>([]);

  const hasWorksheetText = Boolean(worksheetText?.trim());
  const canStartRecording =
    hasWorksheetText &&
    recordingState !== "requesting_permission" &&
    recordingState !== "recording" &&
    recordingState !== "processing";
  const canUsePlayback = Boolean(audioUrl && timelineRef.current?.words.length);
  const showRetry = recordingState === "error" || recordingState === "completed";
  const miscueWords = useMemo(
    () => new Set(miscues.map((miscue) => normalizeKaraokeWord(miscue.word))),
    [miscues]
  );

  const cancelAnimationFrameLoop = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const publishPlaybackState = useCallback(
    (nextTime: number, nextActiveIndex: number, nextCompleted: boolean) => {
      setCurrentTime(nextTime);
      setActiveIndex(nextActiveIndex);
      setPlaybackCompleted(nextCompleted);
      onPlaybackChange({
        activeIndex: nextActiveIndex,
        currentTime: nextTime,
        playbackCompleted: nextCompleted
      });
    },
    [onPlaybackChange]
  );

  const updateHighlightForAudio = useCallback(
    (completed = false) => {
      const audio = audioRef.current;
      const timeline = timelineRef.current;
      const nextTime = audio?.currentTime ?? 0;
      const nextActiveIndex = completed || !timeline ? -1 : getActiveKaraokeIndex(timeline.words, nextTime);

      publishPlaybackState(nextTime, nextActiveIndex, completed);
    },
    [publishPlaybackState]
  );

  const startAnimationFrameLoop = useCallback(() => {
    cancelAnimationFrameLoop();

    const tick = () => {
      updateHighlightForAudio(false);
      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);
  }, [cancelAnimationFrameLoop, updateHighlightForAudio]);

  const clearRecordingLimit = useCallback(() => {
    if (recordingLimitRef.current !== null) {
      window.clearTimeout(recordingLimitRef.current);
      recordingLimitRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    stopMediaStreamTracks(streamRef.current);
    streamRef.current = null;
  }, []);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const resetPlayback = useCallback(() => {
    cancelAnimationFrameLoop();
    audioRef.current?.pause();
    publishPlaybackState(0, -1, false);
  }, [cancelAnimationFrameLoop, publishPlaybackState]);

  const clearAudio = useCallback(() => {
    resetPlayback();
    revokeObjectUrl();
    setAudioUrl(null);
    timelineRef.current = null;
    onTimelineChange(null);
    setMiscues([]);
  }, [onTimelineChange, resetPlayback, revokeObjectUrl]);

  useEffect(() => {
    setActiveSessionId(sessionId);
  }, [sessionId]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      shouldSubmitRecordingRef.current = false;
      cancelAnimationFrameLoop();
      clearRecordingLimit();
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
      recorderRef.current = null;
      stopStream();
      revokeObjectUrl();
    };
  }, [cancelAnimationFrameLoop, clearRecordingLimit, revokeObjectUrl, stopStream]);

  const stopRecording = useCallback(() => {
    if (recordingState !== "recording") {
      return;
    }

    clearRecordingLimit();
    recorderRef.current?.stop();
  }, [clearRecordingLimit, recordingState]);

  const handleStartRecording = async () => {
    if (!canStartRecording) {
      if (!hasWorksheetText) {
        setRecordingState("error");
        setMessage("Scan your worksheet first so the words are ready.");
      }
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === "undefined") {
      setRecordingState("error");
      setMessage("This browser cannot record reading audio. Try Chrome, Edge, or Safari 14.1 or newer.");
      return;
    }

    const mimeType = chooseSupportedRecordingMimeType({
      isTypeSupported: window.MediaRecorder.isTypeSupported.bind(window.MediaRecorder)
    });

    if (!mimeType) {
      setRecordingState("error");
      setMessage("This browser cannot record an audio format WonderWord can read.");
      return;
    }

    clearAudio();
      chunksRef.current = [];
      setRecordingState("requesting_permission");
      setMessage("Waiting for microphone permission...");
      shouldSubmitRecordingRef.current = true;

    let nextSessionId = activeSessionId;

    try {
      nextSessionId = await ensureSession();
      setActiveSessionId(nextSessionId);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType });

      streamRef.current = stream;
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        shouldSubmitRecordingRef.current = false;
        chunksRef.current = [];
        clearRecordingLimit();
        stopStream();
        setRecordingState("error");
        setMessage("The microphone stopped unexpectedly. Please try again.");
      };

      recorder.onstop = () => {
        if (!shouldSubmitRecordingRef.current) {
          return;
        }

        void handleRecordingStopped(nextSessionId, mimeType);
      };

      recorder.start();
      setRecordingState("recording");
      setMessage("Recording. Press Stop when you finish this sentence or passage.");
      recordingLimitRef.current = window.setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
      }, MAX_RECORDING_MS);
    } catch (error) {
      clearRecordingLimit();
      stopStream();
      recorderRef.current = null;
      shouldSubmitRecordingRef.current = false;
      setRecordingState("error");
      setMessage(mapRecordingStartupError(error));
    }
  };

  const handleRecordingStopped = async (nextSessionId: string, mimeType: string) => {
    clearRecordingLimit();
    stopStream();
    recorderRef.current = null;
    shouldSubmitRecordingRef.current = false;

    const audioBlob = new Blob(chunksRef.current, { type: mimeType });
    chunksRef.current = [];

    if (audioBlob.size === 0) {
      if (!isMountedRef.current) {
        return;
      }

      setRecordingState("error");
      setMessage("No reading audio was captured. Please try again.");
      return;
    }

    if (!isMountedRef.current) {
      return;
    }

    setRecordingState("processing");
    setMessage("Listening back to your reading...");

    try {
      const result = await uploadSessionAudio({
        sessionId: nextSessionId,
        audio: audioBlob
      });
      const timeline = buildKaraokeTimeline({
        worksheetText: worksheetText ?? "",
        audio: result
      });

      if (timeline.words.length === 0) {
        throw new Error("malformed_response");
      }

      if (!isMountedRef.current) {
        return;
      }

      revokeObjectUrl();
      const nextUrl = URL.createObjectURL(audioBlob);

      objectUrlRef.current = nextUrl;
      timelineRef.current = timeline;
      setAudioUrl(nextUrl);
      if (audioRef.current) {
        audioRef.current.src = nextUrl;
        audioRef.current.currentTime = 0;
      }
      onTimelineChange(timeline);
      onTranscriptionComplete(result);
      setMiscues(result.miscues);
      publishPlaybackState(0, -1, false);
      setMessage("Ready to listen.");

      if (!audioRef.current) {
        setRecordingState("ready_for_playback");
        setMessage("Ready to listen. Press Play to follow along.");
        return;
      }

      try {
        await audioRef.current.play();
        setRecordingState("playing");
        setMessage("Playing your reading.");
        startAnimationFrameLoop();
      } catch {
        setRecordingState("ready_for_playback");
        setMessage("Ready to listen. Press Play to follow along.");
        window.setTimeout(() => playbackButtonRef.current?.focus(), 0);
      }
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      revokeObjectUrl();
      timelineRef.current = null;
      onTimelineChange(null);
      publishPlaybackState(0, -1, false);
      setRecordingState("error");
      setMessage(mapProcessingError(error));
    }
  };

  const playAudio = async () => {
    const audio = audioRef.current;

    if (!audio || !canUsePlayback) {
      return;
    }

    try {
      setPlaybackCompleted(false);
      if (audio.ended) {
        audio.currentTime = 0;
      }
      await audio.play();
      setRecordingState("playing");
      setMessage("Playing your reading.");
      startAnimationFrameLoop();
    } catch {
      cancelAnimationFrameLoop();
      setRecordingState("error");
      setMessage("The recording could not play in this browser. Please try recording again.");
    }
  };

  const pauseAudio = () => {
    audioRef.current?.pause();
    cancelAnimationFrameLoop();
    updateHighlightForAudio(false);
    setRecordingState("paused");
    setMessage("Paused.");
  };

  const restartAudio = async () => {
    const audio = audioRef.current;

    if (!audio || !canUsePlayback) {
      return;
    }

    audio.currentTime = 0;
    publishPlaybackState(0, getActiveKaraokeIndex(timelineRef.current?.words ?? [], 0), false);
    await playAudio();
  };

  const handleAudioEnded = () => {
    cancelAnimationFrameLoop();
    updateHighlightForAudio(true);
    setRecordingState("completed");
    setMessage(miscues.length > 0 ? "Great reading. You have a few words to practice." : "Great reading. You can try again when ready.");
  };

  const handleTimeUpdate = () => {
    if (recordingState !== "playing") {
      updateHighlightForAudio(false);
    }
  };

  return (
    <section className="rounded-[var(--radius-card)] border border-coral/25 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-navy">Reading controls</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{message}</p>
        </div>
        <span className="rounded-full border border-teal/25 bg-teal/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-teal">
          {recordingState.replace(/_/g, " ")}
        </span>
      </div>

      <p className="sr-only" aria-live="polite">
        {message}
      </p>

      {recordingState === "recording" ? (
        <div className="mt-5 flex items-center gap-3 rounded-[var(--radius-card)] border border-coral/25 bg-coral/10 px-4 py-3 text-sm font-black text-navy">
          <span className="relative flex size-4">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-coral opacity-70 motion-reduce:animate-none" />
            <span className="relative inline-flex size-4 rounded-full bg-coral" />
          </span>
          Recording now
        </div>
      ) : null}

      <div className="mt-5 grid gap-3">
        {recordingState === "recording" ? (
          <button
            type="button"
            onClick={stopRecording}
            aria-label="Stop recording"
            className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[var(--radius-card)] bg-coral px-5 text-base font-black text-white shadow-soft transition hover:bg-coral/90"
          >
            <Square className="size-5 fill-current" />
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStartRecording}
            disabled={!canStartRecording}
            aria-label={showRetry ? "Retry recording" : "Start reading"}
            className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[var(--radius-card)] bg-coral px-5 text-base font-black text-white shadow-soft transition hover:bg-coral/90 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
          >
            <Waves className="size-5" />
            {showRetry ? "Retry recording" : "Start Reading"}
          </button>
        )}

        <div className="grid grid-cols-3 gap-2">
          <button
            ref={playbackButtonRef}
            type="button"
            onClick={playAudio}
            disabled={!canUsePlayback || recordingState === "playing"}
            aria-label="Play recording"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-card)] border border-teal/30 px-3 text-sm font-black text-teal transition hover:bg-teal/10 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
          >
            <Play className="size-4 fill-current" />
            Play
          </button>
          <button
            type="button"
            onClick={pauseAudio}
            disabled={recordingState !== "playing"}
            aria-label="Pause recording"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-card)] border border-teal/30 px-3 text-sm font-black text-teal transition hover:bg-teal/10 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
          >
            <Pause className="size-4 fill-current" />
            Pause
          </button>
          <button
            type="button"
            onClick={restartAudio}
            disabled={!canUsePlayback}
            aria-label="Restart recording"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-card)] border border-teal/30 px-3 text-sm font-black text-teal transition hover:bg-teal/10 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
          >
            <RotateCcw className="size-4" />
            Restart
          </button>
        </div>
      </div>

      {miscues.length > 0 && recordingState === "completed" ? (
        <div className="mt-5 rounded-[var(--radius-card)] border border-coral/25 bg-coral/10 px-4 py-3">
          <p className="text-sm font-black text-navy">Practice words are ready.</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            {miscues.slice(0, 3).map((miscue) => miscue.word).join(", ")}
          </p>
        </div>
      ) : null}

      <audio
        ref={audioRef}
        src={audioUrl ?? undefined}
        className="sr-only"
        preload="metadata"
        onEnded={handleAudioEnded}
        onTimeUpdate={handleTimeUpdate}
        onSeeked={() => updateHighlightForAudio(false)}
        onError={() => {
          cancelAnimationFrameLoop();
          setRecordingState("error");
          setMessage("The recording could not play in this browser. Please try recording again.");
        }}
      />

      <span className="sr-only">
        Playback time {currentTime.toFixed(1)} seconds. Active word {activeIndex + 1}.
      </span>
      <span className="sr-only">{miscueWords.size} practice words available.</span>
    </section>
  );
}

function mapRecordingStartupError(error: unknown) {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "Microphone permission was blocked. Allow microphone access, then try again.";
  }

  if (error instanceof DOMException && error.name === "NotFoundError") {
    return "No microphone was found. Connect a microphone, then try again.";
  }

  return "The microphone could not start. Please try again.";
}

function mapProcessingError(error: unknown) {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "invalid_audio_type":
      case "audio_empty":
      case "audio_missing":
      case "audio_too_large":
        return "That recording did not work. Please try recording again.";
      case "unauthorized":
      case "forbidden":
      case "session_not_found":
        return "This reading session is not available. Return to the scan step and try again.";
      case "session_closed":
        return "This reading session is already closed. Start a new session to keep reading.";
      case "transcription_timeout":
        return "Listening took too long. Please try a shorter passage.";
      case "transcription_unavailable":
      case "ml_configuration_error":
        return "Reading feedback is not available right now. Please try again soon.";
      case "malformed_transcription_response":
        return "The words could not be matched to the recording. Please try again.";
      default:
        return "Reading feedback could not be created. Please try again.";
    }
  }

  return "Reading feedback could not be created. Please try again.";
}
