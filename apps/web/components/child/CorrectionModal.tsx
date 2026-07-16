"use client";

import { useState } from "react";

type Tab = "story" | "phonics" | "listen" | "practice";

const tabs: { id: Tab; label: string }[] = [
  { id: "story", label: "Story" },
  { id: "phonics", label: "Phonics" },
  { id: "listen", label: "Listen" },
  { id: "practice", label: "Practice" },
];

export default function CorrectionModal() {
  const [activeTab, setActiveTab] = useState<Tab>("story");

  return (
    <div className="w-full max-w-md bg-white rounded-[20px] shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h2 className="text-lg font-bold text-gray-900">Reading Feedback</h2>
        <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-1 rounded-full">
          ⚠ 2 errors
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
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
        {activeTab === "story" && <StoryTab />}
        {activeTab === "phonics" && <PhonicsTab />}
        {activeTab === "listen" && <ListenTab />}
        {activeTab === "practice" && <PracticeTab />}
      </div>
    </div>
  );
}

function StoryTab() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-full h-28 bg-[#FAFAFA] rounded-xl flex items-center justify-center text-gray-400 text-sm">
        image
      </div>
      <p className="text-sm text-gray-800 leading-relaxed w-full">
        The{" "}
        <span className="bg-red-100 text-red-600 font-semibold rounded px-1">
          enormous
        </span>{" "}
        elephant walked through the tall green{" "}
        <span className="bg-red-100 text-red-600 font-semibold rounded px-1">
          grass.
        </span>
      </p>
    </div>
  );
}

function PhonicsTab() {
  const syllables = [
    { text: "e", type: "vowel" },
    { text: "nor", type: "consonant" },
    { text: "mous", type: "consonant" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">
            Practice word
          </p>
          <p className="text-2xl font-bold text-gray-900">enormous</p>
        </div>
        <button
          aria-label="Play pronunciation"
          className="w-12 h-12 min-h-[48px] bg-[#E6F5F6] rounded-full flex items-center justify-center text-[#008C9A]"
        >
          🔊
        </button>
      </div>

      <p className="text-xs text-gray-400 uppercase tracking-wide text-center">
        Tap each syllable to hear it
      </p>

      <div className="flex justify-center gap-3">
        {syllables.map((s, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <button
              className={`px-4 py-3 rounded-xl text-white text-lg font-semibold min-h-[48px] min-w-[48px] ${
                s.type === "vowel" ? "bg-red-500" : "bg-blue-400"
              }`}
            >
              {s.text}
            </button>
            <span className="text-xs text-gray-400">#{i + 1}</span>
          </div>
        ))}
      </div>

      <div className="bg-[#E6F5F6] rounded-xl px-4 py-3 flex items-center gap-3">
        <button
          aria-label="Play full pronunciation"
          className="w-12 h-12 min-h-[48px] bg-[#008C9A] rounded-full flex items-center justify-center text-white"
        >
          ▶
        </button>
        <div>
          <p className="text-sm font-semibold text-gray-800">e · nor · mous</p>
          <p className="text-xs text-gray-500">ih · NOR · muhs</p>
        </div>
      </div>

      <button className="w-full min-h-[48px] bg-[#008C9A] text-white rounded-xl font-semibold">
        ↻ Practice Again
      </button>
    </div>
  );
}

function ListenTab() {
  const words = [
    "The",
    "enormous",
    "elephant",
    "walked",
    "through",
    "the",
    "tall",
    "green",
    "grass.",
  ];
  const highlightedIndices = [3, 4]; // "walked", "through"

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-gray-800">Listen Along</p>
        <p className="text-xs text-gray-400">
          Words highlight as the story plays
        </p>
      </div>

      <div className="bg-[#FAFAFA] rounded-xl p-4">
        <p className="text-base leading-relaxed">
          {words.map((word, i) => (
            <span
              key={i}
              className={
                highlightedIndices.includes(i)
                  ? "bg-[#008C9A] text-white rounded px-1"
                  : "text-gray-800"
              }
            >
              {word}{" "}
            </span>
          ))}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400">0:03</span>
        <div className="flex-1 h-1 bg-gray-200 rounded-full relative">
          <div className="h-1 bg-[#008C9A] rounded-full w-[40%]" />
        </div>
        <span className="text-xs text-gray-400">0:08</span>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          aria-label="Restart"
          className="w-12 h-12 min-h-[48px] flex items-center justify-center text-gray-500"
        >
          ↺
        </button>
        <button
          aria-label="Play or pause"
          className="w-12 h-12 min-h-[48px] bg-[#008C9A] rounded-full flex items-center justify-center text-white"
        >
          ▶
        </button>
        <button
          aria-label="Volume"
          className="w-12 h-12 min-h-[48px] flex items-center justify-center text-gray-500"
        >
          🔊
        </button>
      </div>
    </div>
  );
}

function PracticeTab() {
  const [isListening, setIsListening] = useState(false);

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-xs text-gray-400 uppercase tracking-wide">
        Say the highlighted word
      </p>
      <div className="bg-[#E6F5F6] rounded-xl px-6 py-3">
        <p className="text-2xl font-bold text-[#008C9A]">enormous</p>
      </div>
      <p className="text-xs text-gray-400">ih · NOR · muhs</p>

      <button
        aria-label="Start recording"
        onClick={() => setIsListening(!isListening)}
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
    </div>
  );
}