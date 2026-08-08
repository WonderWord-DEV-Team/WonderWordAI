"use client";

import { useMemo, useState } from "react";
import type { SessionAudioMiscue } from "@/lib/audio/schema";

type Tab = "story" | "phonics" | "listen" | "practice";

const tabs: { id: Tab; label: string }[] = [
  { id: "story", label: "Story" },
  { id: "phonics", label: "Phonics" },
  { id: "listen", label: "Listen" },
  { id: "practice", label: "Practice" },
];

type CorrectionModalProps = {
  storyText: string;
  miscues: SessionAudioMiscue[];
  onDone: () => void;
};

function normalizeWord(word: string) {
  return word.toLowerCase().replace(/[^a-z0-9']/g, "");
}

export default function CorrectionModal({
  storyText,
  miscues,
  onDone,
}: CorrectionModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("story");
  const [miscueIndex, setMiscueIndex] = useState(0);

  const currentMiscue = miscues[miscueIndex] ?? null;
  const isLastMiscue = miscueIndex >= miscues.length - 1;

  const handleContinue = () => {
    if (isLastMiscue) {
      onDone();
      return;
    }

    setMiscueIndex((prev) => prev + 1);

    // Return to the story tab for each new miscue.
    setActiveTab("story");
  };

  return (
    <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[20px] bg-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Reading Feedback
          </h2>

          <p className="mt-1 text-xs text-gray-400">
            {miscues.length === 1
              ? "1 word to practice"
              : `${miscues.length} words to practice`}
          </p>
        </div>

        <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-1 rounded-full">
          ⚠ {miscues.length}{" "}
          {miscues.length === 1 ? "error" : "errors"}
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-h-[48px] text-sm font-medium transition ${
              activeTab === tab.id
                ? "text-[#008C9A] border-b-2 border-[#008C9A]"
                : "text-gray-500"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-5">
        {activeTab === "story" && (
          <StoryTab
            storyText={storyText}
            miscues={miscues}
          />
        )}

        {activeTab === "phonics" && (
          <PhonicsTab miscue={currentMiscue} />
        )}

        {activeTab === "listen" && (
          <ListenTab storyText={storyText} />
        )}

        {activeTab === "practice" && (
          <PracticeTab miscue={currentMiscue} />
        )}
      </div>

      {/* Footer action */}
      <div className="px-5 pb-5">
        <button
          type="button"
          onClick={handleContinue}
          className="w-full min-h-[48px] bg-[#008C9A] text-white rounded-xl font-semibold"
        >
          {isLastMiscue ? "Continue to results" : "Next word →"}
        </button>
      </div>
    </div>
  );
}

function StoryTab({
  storyText,
  miscues,
}: {
  storyText: string;
  miscues: SessionAudioMiscue[];
}) {
  const miscueWords = useMemo(
    () =>
      new Set(
        miscues.map((m) => normalizeWord(m.word))
      ),
    [miscues]
  );

  const words = storyText.split(/\s+/).filter(Boolean);

  return (
    <div className="flex flex-col gap-4">
      <div className="w-full h-28 bg-[#FAFAFA] rounded-xl flex items-center justify-center text-gray-400 text-sm">
        Story
      </div>

      <p className="text-base leading-relaxed text-gray-800">
        {words.map((word, i) => (
          <span key={i}>
            {miscueWords.has(normalizeWord(word)) ? (
              <span className="bg-red-100 text-red-600 font-semibold rounded px-1">
                {word}
              </span>
            ) : (
              <span>{word}</span>
            )}
            {" "}
          </span>
        ))}
      </p>
    </div>
  );
}

function PhonicsTab({
  miscue,
}: {
  miscue: SessionAudioMiscue | null;
}) {
  if (!miscue) {
    return (
      <p className="text-sm text-gray-500 text-center">
        No words to practice. Great job!
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <p className="text-xs text-gray-400 uppercase tracking-wide">
          Practice word
        </p>

        <p className="text-3xl font-bold text-gray-900 mt-1">
          {miscue.word}
        </p>
      </div>

      <div className="flex justify-center gap-6">
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-gray-400">
            You said
          </span>

          <span className="bg-red-100 text-red-600 font-semibold rounded-full px-4 py-2 text-lg">
            {miscue.actualPhonemes || "—"}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-gray-400">
            The word is
          </span>

          <span className="bg-[#E6F5F6] text-[#008C9A] font-semibold rounded-full px-4 py-2 text-lg">
            {miscue.expectedPhonemes || "—"}
          </span>
        </div>
      </div>

      {miscue.phonicsCategory ? (
        <p className="text-xs text-gray-400 text-center">
          Focus skill: {miscue.phonicsCategory}
        </p>
      ) : null}

      {miscue.similarityScore !== undefined ? (
        <p className="text-xs text-gray-400 text-center">
          Similarity:{" "}
          {Math.round(miscue.similarityScore * 100)}%
        </p>
      ) : null}
    </div>
  );
}

function ListenTab({
  storyText,
}: {
  storyText: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-gray-800">
          Listen Along
        </p>

        <p className="text-xs text-gray-400">
          Read along with the story text
        </p>
      </div>

      <div className="bg-[#FAFAFA] rounded-xl p-4">
        <p className="text-base leading-relaxed text-gray-800">
          {storyText}
        </p>
      </div>
    </div>
  );
}

function PracticeTab({
  miscue,
}: {
  miscue: SessionAudioMiscue | null;
}) {
  const [isListening, setIsListening] = useState(false);

  if (!miscue) {
    return (
      <p className="text-sm text-gray-500 text-center">
        No words to practice. Great job!
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-xs text-gray-400 uppercase tracking-wide">
        Say the highlighted word
      </p>

      <div className="bg-[#E6F5F6] rounded-xl px-6 py-3">
        <p className="text-2xl font-bold text-[#008C9A]">
          {miscue.word}
        </p>
      </div>

      <p className="text-xs text-gray-400">
        Expected: {miscue.expectedPhonemes || "—"}
      </p>

      <button
        type="button"
        aria-label="Start recording"
        onClick={() => setIsListening((prev) => !prev)}
        className="relative w-20 h-20 min-h-[48px] flex items-center justify-center"
      >
        {isListening && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
        )}

        <span className="relative w-20 h-20 bg-red-500 rounded-full active:scale-95 transition flex items-center justify-center text-white">
          🎤
        </span>
      </button>

      {isListening && (
        <p className="text-sm text-gray-500">
          Listening...
        </p>
      )}
    </div>
  );
}