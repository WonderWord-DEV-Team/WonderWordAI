"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type Correction = {
  word: string;
  timestamp: number;
};

type ChildSessionState = {
  sessionId: string;
  activeWordIndex: number;
  setActiveWordIndex: (index: number) => void;
  corrections: Correction[];
  addCorrection: (correction: Correction) => void;
};

const ChildSessionContext = createContext<ChildSessionState | undefined>(undefined);

export function ChildSessionProvider({
  sessionId,
  children,
}: {
  sessionId: string;
  children: ReactNode;
}) {
  const [activeWordIndex, setActiveWordIndex] = useState(0);
  const [corrections, setCorrections] = useState<Correction[]>([]);

  const addCorrection = (correction: Correction) => {
    setCorrections((prev) => [...prev, correction]);
  };

  return (
    <ChildSessionContext.Provider
      value={{ sessionId, activeWordIndex, setActiveWordIndex, corrections, addCorrection }}
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