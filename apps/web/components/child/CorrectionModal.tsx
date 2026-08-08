"use client";

import { useEffect, useMemo, useState } from "react";
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

type PhonicsLookupResult = {
  category: string;
  rule_explanation: string;
  examples: string[];
  similarity_score: number;
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
          {isLastMiscue
            ? "Continue to results"
            : "Next word →"}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Story                                                                       */
/* -------------------------------------------------------------------------- */

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

  const words = storyText
    .split(/\s+/)
    .filter(Boolean);

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

/* -------------------------------------------------------------------------- */
/* Phonics                                                                     */
/* -------------------------------------------------------------------------- */

function PhonicsTab({
  miscue,
}: {
  miscue: SessionAudioMiscue | null;
}) {
  const [result, setResult] =
    useState<PhonicsLookupResult | null>(null);

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function lookupPhonics() {
      if (!miscue?.word) {
        setResult(null);
        setError(null);
        return;
      }

      /*
       * IMPORTANT:
       *
       * The phonics lookup is based on the TARGET WORD,
       * not on the child's phoneme output.
       *
       * Example:
       *
       *   miscue.word = "enormous"
       *   actualPhonemes = what the child said
       *
       * We lookup "enormous" in the phonics knowledge base.
       */

      const word = normalizeWord(miscue.word);

      if (!word) {
        setResult(null);
        setError(
          "We couldn't identify this word."
        );
        return;
      }

      setIsLoading(true);
      setError(null);
      setResult(null);

      try {
        const response = await fetch(
          "/api/phonics-lookup",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              stuck_word: word,

              /*
               * This is optional context.
               *
               * It tells the phonics service what the child
               * actually said, but DOES NOT replace the target
               * word used for the lookup.
               */
              error_description:
                miscue.actualPhonemes
                  ? `Child pronunciation: ${miscue.actualPhonemes}`
                  : undefined,
            }),
          }
        );

        const data = await response
          .json()
          .catch(() => null);

        if (!response.ok) {
          throw new Error(
            data?.error?.message ||
              "No phonics rule was found for this word."
          );
        }

        if (!cancelled) {
          setResult(
            data as PhonicsLookupResult
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load phonics information."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void lookupPhonics();

    return () => {
      cancelled = true;
    };
  }, [
    miscue?.word,
    miscue?.actualPhonemes,
  ]);

  /*
   * Hear the correct pronunciation of the target word.
   *
   * This is separate from the phonics lookup.
   * The lookup gives the instructional rule;
   * speech synthesis lets the child hear the word.
   */
  const speak = (text: string) => {
    if (
      typeof window === "undefined" ||
      !window.speechSynthesis
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(text);

    utterance.rate = 0.8;
    utterance.lang = "en-US";

    window.speechSynthesis.speak(
      utterance
    );
  };

  if (!miscue) {
    return (
      <p className="text-sm text-gray-500 text-center">
        No words to practice. Great job!
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Target word */}
      <div className="text-center">
        <p className="text-xs text-gray-400 uppercase tracking-wide">
          Practice word
        </p>

        <div className="mt-1 flex items-center justify-center gap-3">
          <p className="text-3xl font-bold text-gray-900">
            {miscue.word}
          </p>

          <button
            type="button"
            onClick={() =>
              speak(miscue.word)
            }
            aria-label={`Hear correct pronunciation of ${miscue.word}`}
            className="w-11 h-11 rounded-full bg-[#E6F5F6] text-[#008C9A] flex items-center justify-center hover:bg-[#d7eff1] transition"
          >
            🔊
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="rounded-xl bg-[#FAFAFA] p-4 text-center">
          <p className="text-sm text-gray-500">
            Finding the phonics pattern...
          </p>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="rounded-xl bg-amber-50 p-4 text-center">
          <p className="text-sm text-amber-700">
            {error}
          </p>

          <p className="mt-1 text-xs text-amber-600">
            The word can still be practiced
            using the pronunciation above.
          </p>
        </div>
      )}

      {/* Correct phonics information */}
      {result && !isLoading && (
        <>
          {/* Phonics skill */}
          <div className="rounded-xl bg-[#E6F5F6] p-4">
            <p className="text-xs text-[#008C9A] uppercase tracking-wide font-semibold">
              Phonics skill
            </p>

            <p className="mt-1 text-base font-bold text-gray-900">
              {result.category}
            </p>
          </div>

          {/* Rule explanation */}
          <div className="rounded-xl bg-[#FAFAFA] p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">
              How the word works
            </p>

            <p className="mt-2 text-sm leading-relaxed text-gray-700">
              {result.rule_explanation}
            </p>
          </div>

          {/* Example words */}
          {result.examples &&
            result.examples.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">
                  More words with this pattern
                </p>

                <div className="flex flex-wrap gap-2">
                  {result.examples
                    .slice(0, 6)
                    .map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() =>
                          speak(example)
                        }
                        className="rounded-full bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition"
                      >
                        {example} 🔊
                      </button>
                    ))}
                </div>
              </div>
            )}

          {/* Similarity */}
          {result.similarity_score !==
            undefined && (
            <p className="text-xs text-gray-400 text-center">
              Phonics match:{" "}
              {Math.round(
                result.similarity_score * 100
              )}
              %
            </p>
          )}
        </>
      )}

      {/* Child's pronunciation */}
      <div className="rounded-xl border border-gray-100 p-4">
        <p className="text-xs text-gray-400 uppercase tracking-wide">
          Your pronunciation
        </p>

        <p className="mt-1 text-sm text-red-600 font-semibold">
          {miscue.actualPhonemes ||
            "Not available"}
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Listen                                                                      */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Practice                                                                    */
/* -------------------------------------------------------------------------- */

function PracticeTab({
  miscue,
}: {
  miscue: SessionAudioMiscue | null;
}) {
  const [isListening, setIsListening] =
    useState(false);

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
        Expected:{" "}
        {miscue.expectedPhonemes || "—"}
      </p>

      <button
        type="button"
        aria-label="Start recording"
        onClick={() =>
          setIsListening((prev) => !prev)
        }
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