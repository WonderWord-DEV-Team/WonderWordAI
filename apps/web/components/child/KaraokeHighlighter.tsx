"use client";

import { useEffect, useRef, useState } from "react";

type WordTiming = {
  word: string;
  start: number;
  end: number;
};

type KaraokeHighlighterProps = {
  words: WordTiming[];
  isPlaying: boolean;
  audioRef: React.RefObject<HTMLAudioElement>;
};

export default function KaraokeHighlighter({
  words,
  isPlaying,
  audioRef,
}: KaraokeHighlighterProps) {
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying || !audioRef.current) return;

    const update = () => {
      const currentTime = audioRef.current?.currentTime ?? 0;
      const index = words.findIndex(
        (w) => currentTime >= w.start && currentTime < w.end
      );
      setActiveIndex(index);
      frameRef.current = requestAnimationFrame(update);
    };

    frameRef.current = requestAnimationFrame(update);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [isPlaying, words, audioRef]);

  return (
    <p className="text-lg leading-relaxed text-gray-800">
      {words.map((w, i) => (
        <span
          key={i}
          className={
            i <= activeIndex
              ? "text-[#008C9A] font-semibold transition-colors"
              : "text-gray-800 transition-colors"
          }
        >
          {w.word}{" "}
        </span>
      ))}
    </p>
  );
}