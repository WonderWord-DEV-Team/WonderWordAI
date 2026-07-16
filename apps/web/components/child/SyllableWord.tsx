"use client";

import { useState } from "react";

type SyllableWordProps = {
  word: string;
  syllables: string[];
};

export default function SyllableWord({ word, syllables }: SyllableWordProps) {
  const [isSplit, setIsSplit] = useState(false);

  return (
    <button
      onClick={() => setIsSplit(!isSplit)}
      aria-label={`Tap to ${isSplit ? "hide" : "show"} syllables for ${word}`}
      className="inline-flex items-center gap-1 min-h-[48px] px-2 rounded-xl hover:bg-[#E6F5F6] active:scale-95 transition"
    >
      {isSplit ? (
        syllables.map((syl, i) => (
          <span
            key={i}
            className="bg-[#008C9A] text-white text-lg font-semibold rounded-lg px-3 py-2"
          >
            {syl}
          </span>
        ))
      ) : (
        <span className="text-lg text-gray-800">{word}</span>
      )}
    </button>
  );
}