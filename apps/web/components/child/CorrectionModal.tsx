"use client";

import { useEffect, useMemo, useState } from "react";
import type { SessionAudioMiscue } from "@/lib/audio/schema";
import { StoryTab, renderStoryText } from "@/components/child/StoryTab";
import { useWordStory } from "@/hooks/useWordStory";

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
  // The signed-in child's id, used to generate a fresh, on-topic story +
  // illustration for whichever word is currently being practiced. When
  // omitted (or null), the modal falls back to showing the original
  // worksheet text instead of generating anything.
  childId?: string | null;
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
  childId = null,
  onDone,
}: CorrectionModalProps) {
  // Track *which tab* we're on within the current word, rather than just
  // the tab id, so the footer button can tell whether every tab has been
  // visited yet for this word.
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [miscueIndex, setMiscueIndex] = useState(0);

  const activeTab = tabs[activeTabIndex].id;
  const currentMiscue = miscues[miscueIndex] ?? null;
  const isLastTabForWord = activeTabIndex >= tabs.length - 1;
  const isLastMiscue = miscueIndex >= miscues.length - 1;

  // All of the words the child misread, normalized -- used to highlight
  // them (in red) anywhere story text is shown.
  const miscueWords = useMemo(
    () => new Set(miscues.map((m) => normalizeWord(m.word))),
    [miscues]
  );

  // Generates (and caches) a story + illustration specific to the current
  // word. Shared by the Story tab and the Listen tab so every tab's
  // activity -- story, phonics, listening, practice -- is scoped to
  // whichever mispronounced word is currently active.
  const wordStory = useWordStory({
    childId,
    miscue: currentMiscue,
    fallbackText: storyText,
  });

  const handleContinue = () => {
    if (!isLastTabForWord) {
      // Still stepping through this word's tabs (Story -> Phonics -> Listen -> Practice).
      setActiveTabIndex((prev) => prev + 1);
      return;
    }

    // Every tab has been gone through for this word.
    if (isLastMiscue) {
      onDone();
      return;
    }

    // Move on to the next incorrect word (repeats of the same word are
    // treated as their own pass through all four tabs) and start it back
    // on the Story tab.
    setMiscueIndex((prev) => prev + 1);
    setActiveTabIndex(0);
  };

  const footerLabel = !isLastTabForWord
    ? "Next Tab →"
    : isLastMiscue
      ? "Continue to results"
      : "Next word →";

  return (
    <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[20px] bg-white shadow-2xl">
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
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTabIndex(index)}
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
            storyText={wordStory.storyText}
            imageStatus={wordStory.status}
            imageUrl={wordStory.imageUrl}
            highlightWords={miscueWords}
            normalizeWord={normalizeWord}
          />
        )}

        {activeTab === "phonics" && (
          <PhonicsTab miscue={currentMiscue} />
        )}

        {activeTab === "listen" && (
          <ListenTab
            word={currentMiscue?.word ?? null}
            storyText={wordStory.storyText}
            highlightWords={miscueWords}
          />
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
          {footerLabel}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Story                                                                       */
/* -------------------------------------------------------------------------- */
/* Story generation is handled by the shared `useWordStory` hook above (see  */
/* its call in CorrectionModal) so the Story and Listen tabs both render the */
/* exact same word-specific story.                                           */

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

    utterance.rate = 0.5;
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
  word,
  storyText,
  highlightWords,
}: {
  word: string | null;
  storyText: string | null;
  highlightWords: Set<string>;
}) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = () => {
    if (
      !storyText ||
      typeof window === "undefined" ||
      !window.speechSynthesis
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(storyText);
    utterance.rate = 0.5;
    utterance.lang = "en-US";
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const togglePlayback = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }

    const synth = window.speechSynthesis;

    // Actively playing -> pause in place (don't cancel/restart).
    if (synth.speaking && !synth.paused) {
      synth.pause();
      setIsSpeaking(false);
      return;
    }

    // Paused -> resume from where it left off.
    if (synth.paused) {
      synth.resume();
      setIsSpeaking(true);
      return;
    }

    // Nothing playing yet (or it already finished) -> start fresh.
    speak();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">
            Listen Along
          </p>

          <p className="text-xs text-gray-400">
            {word
              ? `Read along with the story for "${word}"`
              : "Read along with the story"}
          </p>
        </div>

        <button
          type="button"
          onClick={togglePlayback}
          disabled={!storyText}
          aria-label={
            word ? `Listen to the story for ${word}` : "Listen to the story"
          }
          className="w-11 h-11 shrink-0 rounded-full bg-[#E6F5F6] text-[#008C9A] flex items-center justify-center hover:bg-[#d7eff1] transition disabled:opacity-40"
        >
          {isSpeaking ? "⏸" : "🔊"}
        </button>
      </div>

      <div className="bg-[#FAFAFA] rounded-xl p-4">
        {storyText ? (
          <p className="text-base leading-relaxed text-gray-800">
            {renderStoryText(storyText, highlightWords, normalizeWord)}
          </p>
        ) : (
          <p className="text-sm text-gray-500">
            Loading this word&apos;s story...
          </p>
        )}
      </div>

      {isSpeaking && (
        <p className="text-xs text-gray-400 text-center">
          Reading aloud...
        </p>
      )}
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