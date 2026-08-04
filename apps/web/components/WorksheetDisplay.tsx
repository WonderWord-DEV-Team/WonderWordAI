"use client";

import { useEffect, useRef, useState } from "react";
import KaraokeHighlighter from "@/components/child/KaraokeHighlighter";

type WordTiming = {
  word: string;
  start: number;
  end: number;
};

type WorksheetDisplayProps = {
  storyName?: string;
  text: string;
  words: WordTiming[];
  audioSrc: string;
  childName?: string;
  stars?: number;
};

export default function WorksheetDisplay({
  storyName = "Story Name",
  text,
  words,
  audioSrc,
  childName = "Emma",
  stars = 1240,
}: WorksheetDisplayProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleToggle = () => {
    if (isRecording) {
      audioRef.current?.pause();
      setIsRecording(false);
    } else {
      audioRef.current?.play();
      setIsRecording(true);
      setSeconds(0);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF8F2]">
      <header className="flex items-center justify-between px-6 sm:px-12 py-5 bg-white border-b border-gray-100">
        <p className="text-xl font-black">
          <span className="text-[#E8604F]">Wonder</span>
          <span className="text-[#0F9C8E]">Word</span>{" "}
          <span className="text-[#F5A623]">AI</span>
        </p>
        <nav className="hidden sm:flex items-center gap-8 text-sm font-bold text-gray-700">
          <a href="#" className="text-[#E8604F] border-b-2 border-[#E8604F] pb-1">Home</a>
          <a href="#" className="hover:text-[#E8604F]">Story Library</a>
          <a href="#" className="hover:text-[#E8604F]">Store</a>
          <a href="#" className="hover:text-[#E8604F]">Diagnostics</a>
        </nav>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 bg-amber-50 rounded-full px-3 py-1.5 text-sm font-bold text-gray-700">
            ⭐ {stars.toLocaleString()}
          </span>
          <span className="flex items-center gap-2 bg-gray-50 rounded-full pl-1 pr-3 py-1">
            <span className="w-7 h-7 rounded-full bg-gray-200" />
            <span className="text-sm font-bold text-gray-700">{childName}</span>
          </span>
        </div>
      </header>

      <div className="px-6 sm:px-12 py-8 max-w-3xl mx-auto">
        <button className="text-sm font-bold text-[#E8604F] flex items-center gap-1">
          ⇱ End Session
        </button>

        <h1 className="mt-3 text-4xl font-black text-gray-900">Reading Mode</h1>
        <p className="mt-2 text-sm text-gray-500">
          {isRecording ? "Listening..." : 'Tap "Start reading" when you\'re ready'}
        </p>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-[#F5A623] rounded-2xl p-4 text-white">
            <p className="text-xs font-bold uppercase tracking-wide">Time</p>
            <p className="mt-1 text-2xl font-black">
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
            </p>
          </div>
          <div className="bg-[#0F9C8E] rounded-2xl p-4 text-white">
            <p className="text-xs font-bold uppercase tracking-wide">Words Read</p>
            <p className="mt-1 text-2xl font-black">{words.length}</p>
          </div>
          <div className="bg-[#E8604F] rounded-2xl p-4 text-white">
            <p className="text-xs font-bold uppercase tracking-wide">Accuracy</p>
            <p className="mt-1 text-2xl font-black">--</p>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-3xl shadow-sm p-8">
          <p className="text-sm font-bold text-gray-500">{storyName}</p>
          <div className="mt-4 text-3xl font-black leading-[1.6] text-gray-800">
            <KaraokeHighlighter words={words} isPlaying={isRecording} audioRef={audioRef} />
          </div>
        </div>

        <audio ref={audioRef} src={audioSrc} onEnded={() => setIsRecording(false)} />

        <div className="mt-8 flex items-center justify-center gap-8">
          <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center text-4xl">
            👹
          </div>
          <button
            onClick={handleToggle}
            className="flex items-center gap-3 bg-[#E8604F] hover:bg-[#d9543f] text-white font-black rounded-full px-8 py-4 min-h-[48px] transition"
          >
            🎤 {isRecording ? "Stop Reading" : "Start Read It Aloud"}
          </button>
        </div>
      </div>
    </div>
  );
}