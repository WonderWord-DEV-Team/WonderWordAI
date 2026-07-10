"use client";

import { ChildSessionProvider, useChildSession } from "@/components/child/ChildSessionContext";

function TestPanel() {
  const { activeWordIndex, setActiveWordIndex, corrections, addCorrection } = useChildSession();

  return (
    <div className="p-8 space-y-4">
      <p>Active word index: {activeWordIndex}</p>
      <button
        className="px-4 py-2 bg-[#008C9A] text-white rounded-lg"
        onClick={() => setActiveWordIndex(activeWordIndex + 1)}
      >
        Next word
      </button>

      <p>Corrections: {corrections.length}</p>
      <button
        className="px-4 py-2 bg-red-500 text-white rounded-lg"
        onClick={() => addCorrection({ word: "enormous", timestamp: Date.now() })}
      >
        Add mock correction
      </button>
    </div>
  );
}

export default function ContextTestPage() {
  return (
    <ChildSessionProvider sessionId="demo-session">
      <TestPanel />
    </ChildSessionProvider>
  );
}