"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import type { SessionAudioData } from "@/lib/audio/schema";

type Correction = {
  word: string;
  timestamp: number;
};

export type WorksheetUploadStatus =
  | "idle"
  | "requesting_camera"
  | "camera_ready"
  | "image_selected"
  | "uploading"
  | "ocr_complete"
  | "error";

type OcrResult = {
  sessionId: string;
  text: string;
  imageKeywords: string[];
};

type ChildSessionState = {
  sessionId: string;
  setSessionId: (sessionId: string) => void;
  activeWordIndex: number;
  setActiveWordIndex: (index: number) => void;
  corrections: Correction[];
  addCorrection: (correction: Correction) => void;
  worksheetText: string | null;
  imageKeywords: string[];
  worksheetStatus: WorksheetUploadStatus;
  latestTranscription: SessionAudioData | null;
  setLatestTranscription: (result: SessionAudioData | null) => void;
  setWorksheetStatus: (status: WorksheetUploadStatus) => void;
  setOcrResult: (result: OcrResult) => void;
  clearOcrResult: () => void;
};

const ChildSessionContext = createContext<ChildSessionState | undefined>(undefined);

export function ChildSessionProvider({
  sessionId,
  children,
}: {
  sessionId: string;
  children: ReactNode;
}) {
  const [activeSessionId, setActiveSessionId] = useState(sessionId);
  const [activeWordIndex, setActiveWordIndex] = useState(0);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [worksheetText, setWorksheetText] = useState<string | null>(null);
  const [imageKeywords, setImageKeywords] = useState<string[]>([]);
  const [worksheetStatus, setWorksheetStatus] = useState<WorksheetUploadStatus>("idle");
  const [latestTranscription, setLatestTranscription] = useState<SessionAudioData | null>(null);

  const addCorrection = (correction: Correction) => {
    setCorrections((prev) => [...prev, correction]);
  };

  const setOcrResult = (result: OcrResult) => {
    setActiveSessionId(result.sessionId);
    setWorksheetText(result.text);
    setImageKeywords(result.imageKeywords);
    setWorksheetStatus("ocr_complete");
    setActiveWordIndex(0);
    setLatestTranscription(null);
  };

  const clearOcrResult = () => {
    setWorksheetText(null);
    setImageKeywords([]);
    setWorksheetStatus("idle");
    setActiveWordIndex(0);
    setLatestTranscription(null);
  };

  return (
    <ChildSessionContext.Provider
      value={{
        sessionId: activeSessionId,
        setSessionId: setActiveSessionId,
        activeWordIndex,
        setActiveWordIndex,
        corrections,
        addCorrection,
        worksheetText,
        imageKeywords,
        worksheetStatus,
        latestTranscription,
        setLatestTranscription,
        setWorksheetStatus,
        setOcrResult,
        clearOcrResult
      }}
    >
      {children}
    </ChildSessionContext.Provider>
  );
}

export function useChildSession() {
  const context = useContext(ChildSessionContext);
  if (!context) {
    throw new Error("useChildSession must be used within a ChildSessionProvider");
  }
  return context;
}
