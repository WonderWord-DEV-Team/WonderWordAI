"use client";

import { useRef, useState } from "react";
import KaraokeHighlighter from "./KaraokeHighlighter";

type WordTiming = {
  word: string;
  start: number;
  end: number;
};

type ListenTabContentProps = {
  words: WordTiming[];
  audioSrc: string;
};

export default function ListenTabContent({ words, audioSrc }: ListenTabContentProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const restart = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play();
    setIsPlaying(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-gray-800">Listen Along</p>
        <p className="text-xs text-gray-400">Words highlight as the story plays</p>
      </div>

      <div className="bg-[#FAFAFA] rounded-xl p-4">
        <KaraokeHighlighter words={words} isPlaying={isPlaying} audioRef={audioRef} />
      </div>

      <audio
        ref={audioRef}
        src={audioSrc}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="flex items-center justify-center gap-4">
        <button
          aria-label="Restart"
          onClick={restart}
          className="w-12 h-12 min-h-[48px] flex items-center justify-center text-gray-500"
        >
          ↺
        </button>
        <button
          aria-label={isPlaying ? "Pause" : "Play"}
          onClick={togglePlay}
          className="w-12 h-12 min-h-[48px] bg-[#008C9A] rounded-full flex items-center justify-center text-white"
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
      </div>
    </div>
  );
}