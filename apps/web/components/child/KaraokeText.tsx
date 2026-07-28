"use client";

import {
  getKaraokeWordStatus,
  type KaraokeTimeline,
  type KaraokeWordStatus
} from "@/lib/karaoke/timeline";

type KaraokeTextProps = {
  timeline: KaraokeTimeline | null;
  fallbackText: string;
  activeIndex: number;
  currentTime: number;
  playbackCompleted: boolean;
  miscueWords?: Set<string>;
};

const statusClasses: Record<KaraokeWordStatus | "skipped", string> = {
  pending: "text-navy",
  active:
    "bg-coral text-white shadow-[0_5px_0_rgb(var(--color-navy)/0.15)] ring-2 ring-coral/25",
  completed: "bg-teal/12 text-navy underline decoration-teal decoration-4 underline-offset-4",
  unmatched: "text-muted",
  skipped: "text-navy decoration-coral/70 decoration-wavy underline underline-offset-4"
};

export function KaraokeText({
  timeline,
  fallbackText,
  activeIndex,
  currentTime,
  playbackCompleted,
  miscueWords
}: KaraokeTextProps) {
  if (!timeline) {
    return (
      <p className="whitespace-pre-wrap text-2xl font-extrabold leading-10 text-navy">
        {fallbackText}
      </p>
    );
  }

  const wordByWorksheetIndex = new Map<number, { word: (typeof timeline.words)[number]; wordIndex: number }>();

  timeline.words.forEach((word, wordIndex) => {
    if (word.worksheetIndex !== null) {
      wordByWorksheetIndex.set(word.worksheetIndex, { word, wordIndex });
    }
  });
  const skippedIndexes = new Set(timeline.skippedWorksheetIndexes);

  return (
    <p className="whitespace-pre-wrap text-2xl font-extrabold leading-[2.75rem] text-navy sm:text-[1.7rem]">
      {timeline.worksheetParts.map((part) => {
        if (part.type === "separator") {
          return <span key={part.id}>{part.text}</span>;
        }

        const matched = wordByWorksheetIndex.get(part.worksheetIndex);
        const isSkipped = skippedIndexes.has(part.worksheetIndex);
        const hasMiscue = miscueWords?.has(part.normalizedWord) ?? false;
        const status = matched
          ? getKaraokeWordStatus({
              word: matched.word,
              wordIndex: matched.wordIndex,
              activeIndex,
              currentTime,
              playbackCompleted
            })
          : isSkipped
            ? "skipped"
            : "pending";

        return (
          <span
            key={part.id}
            data-karaoke-status={status}
            className={`inline-block min-h-12 rounded-[var(--radius-card)] px-1.5 align-baseline transition-colors motion-safe:duration-150 ${statusClasses[status]} ${
              hasMiscue ? "ring-2 ring-coral/35" : ""
            }`}
          >
            {part.text}
          </span>
        );
      })}
    </p>
  );
}
