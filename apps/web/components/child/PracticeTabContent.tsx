"use client";

import { useState } from "react";

type Wav2VecResult = {
  phonemes: string[];
  similarity: number;
  confidence: boolean;
};

type PracticeTabContentProps = {
  word: string;
  onRecordComplete?: () => Promise<Wav2VecResult>;
};

export default function PracticeTabContent({
  word,
  onRecordComplete,
}: PracticeTabContentProps) {
  const [isListening, setIsListening] = useState(false);
  const [result, setResult] = useState<Wav2VecResult | null>(null);

  const handleRecordToggle = async () => {
    if (isListening) {
      setIsListening(false);
      if (onRecordComplete) {
        const res = await onRecordComplete();
        setResult(res);
      }
    } else {
      setIsListening(true);
      setResult(null);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-xs text-gray-400 uppercase tracking-wide">
        Say the highlighted word
      </p>
      <div className="bg-[#E6F5F6] rounded-xl px-6 py-3">
        <p className="text-2xl font-bold text-[#008C9A]">{word}</p>
      </div>

      <button
        aria-label={isListening ? "Stop recording" : "Start recording"}
        onClick={handleRecordToggle}
        className="relative w-20 h-20 min-h-[48px] flex items-center justify-center"
      >
        {isListening && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
        )}
        <span className="relative w-20 h-20 bg-red-500 rounded-full active:scale-95 transition flex items-center justify-center text-white">
          🎤
        </span>
      </button>

      {isListening && <p className="text-sm text-gray-500">Listening...</p>}

      {result && (
        <div
          className={`w-full rounded-xl px-4 py-3 flex items-center gap-3 ${
            result.confidence ? "bg-green-50" : "bg-red-50"
          }`}
        >
          <span
            className={`w-8 h-8 min-h-[32px] rounded-full flex items-center justify-center text-white text-sm font-bold ${
              result.confidence ? "bg-green-500" : "bg-red-500"
            }`}
          >
            {result.confidence ? "✓" : "✕"}
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {result.confidence ? "Correct!" : "Try again"}
            </p>
            <p className="text-xs text-gray-500">
              Similarity: {(result.similarity * 100).toFixed(0)}% · Phonemes:{" "}
              {result.phonemes.join(" · ")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}