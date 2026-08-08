"use client";
import { AppHeader } from "@/components/shared/AppHeader";
import { AppFooter } from "@/components/shared/AppFooter";
import Image from "next/image";
import { useState } from "react";

type Stage = "idle" | "ready" | "recording" | "correct" | "incorrect";

const wordData = {
  word: "GRASS",
  sentence: "Emma ran through the tall green grass in her backyard.",
  highlightWord: "grass",
};

export default function ReadAloudFlow({
  monsterName = "name",
}: {
  monsterName?: string;
}) {
  const [stage, setStage] = useState("idle");
  const [typedWord, setTypedWord] = useState("");

  const sentenceParts = wordData.sentence.split(
    new RegExp(`(${wordData.highlightWord})`, "i")
  );

  const renderSentence = () =>
    sentenceParts.map((part, i) =>
      part.toLowerCase() === wordData.highlightWord ? (
        <span key={i} className="font-black text-[#E8604F]">
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    );

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />

      <div className="flex-1 flex flex-col items-center px-6 py-10">
        <div className="max-w-2xl w-full mx-auto">
          <button className="text-sm font-bold text-[#E8604F] flex items-center gap-1">
            ⇱ End Session
          </button>

          <h1 className="mt-3 text-4xl font-black text-gray-900">Read Aloud</h1>
          <p className="mt-2 text-sm text-gray-500">
            Listen to the word, then say it yourself!
          </p>

          <div className="mt-6 relative">
            <input
              value={typedWord}
              onChange={(e) => {
                setTypedWord(e.target.value);
                setStage(e.target.value ? "ready" : "idle");
              }}
              placeholder="Type a word..."
              className="w-full rounded-full border border-gray-200 bg-white px-6 py-4 text-lg outline-none focus:border-[#E8604F]"
            />
            {typedWord && (
              <button
                onClick={() => {
                  setTypedWord("");
                  setStage("idle");
                }}
                aria-label="Clear"
                className="absolute right-6 top-1/2 -translate-y-1/2 min-w-[48px] min-h-[48px] flex items-center justify-center text-gray-900 font-bold text-lg"
              >
                ✕
              </button>
            )}
          </div>

          {stage !== "idle" && (
            <div className="mt-8 bg-white rounded-3xl shadow-sm p-10 flex flex-col items-center">
              <div className="w-40 h-40 rounded-full bg-pink-50 flex items-center justify-center overflow-hidden">
                <Image
                  src="/monsters/blue-monster.png"
                  alt={monsterName}
                  width={140}
                  height={140}
                  className="object-contain"
                />
              </div>
              <p className="mt-4 text-sm text-gray-500">
                Tap to hear [{monsterName}] say it!
              </p>
              <p className="mt-3 text-6xl font-black text-gray-900">
                {wordData.word}
              </p>

              <p className="mt-8 text-xs font-bold text-gray-400 uppercase tracking-wide">
                In a sentence
              </p>
              <div className="mt-2 border border-gray-200 rounded-xl px-5 py-4 text-center text-sm text-gray-700 max-w-xs">
                {renderSentence()}
              </div>
            </div>
          )}

          {(stage === "correct" || stage === "incorrect") && (
            <div
              className={`mt-6 rounded-2xl px-5 py-4 font-bold text-center ${
                stage === "correct"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {stage === "correct"
                ? "🎉 Great job! You said it perfectly!"
                : "Almost! Listen one more time and try again!"}
            </div>
          )}

          {stage === "correct" && (
            <p className="mt-4 text-center text-2xl font-black text-gray-900">
              +20 Stars ⭐
            </p>
          )}

          {stage === "ready" && (
            <div className="mt-6 flex justify-center gap-4">
              <button className="flex items-center gap-2 rounded-full bg-[#3FC1B0] text-white font-black px-6 py-3 min-h-[48px]">
                🔊 Hear [{monsterName}] say it
              </button>
              <button
                onClick={() => setStage("recording")}
                className="rounded-full bg-[#E8604F] text-white font-black px-8 py-3 min-h-[48px]"
              >
                Try it!
              </button>
            </div>
          )}

          {stage === "recording" && (
            <div className="mt-6 flex justify-center gap-4">
              <button className="flex items-center gap-2 rounded-full bg-[#3FC1B0] text-white font-black px-6 py-3 min-h-[48px]">
                🔊 Hear [{monsterName}] say it
              </button>
              <button
                onClick={() =>
                  setStage(Math.random() > 0.3 ? "correct" : "incorrect")
                }
                className="flex items-center gap-2 rounded-full bg-black text-white font-black px-6 py-3 min-h-[48px]"
              >
                ⬛ Stop recording
              </button>
            </div>
          )}

          {stage === "correct" && (
            <div className="mt-6 flex justify-center gap-4">
              <button
                onClick={() => setStage("ready")}
                className="flex items-center gap-2 rounded-full bg-[#3FC1B0] text-white font-black px-6 py-3 min-h-[48px]"
              >
                ↻ Try again
              </button>
              <button className="rounded-full bg-[#E8604F] text-white font-black px-8 py-3 min-h-[48px]">
                Finish
              </button>
            </div>
          )}

          {stage === "incorrect" && (
            <div className="mt-6 flex justify-center gap-4">
              <button className="flex items-center gap-2 rounded-full bg-[#3FC1B0] text-white font-black px-6 py-3 min-h-[48px]">
                🔊 Hear [{monsterName}] say it
              </button>
              <button
                onClick={() => setStage("ready")}
                className="flex items-center gap-2 rounded-full bg-[#E8604F] text-white font-black px-6 py-3 min-h-[48px]"
              >
                ↻ Try again
              </button>
            </div>
          )}
        </div>
      </div>

      <AppFooter />
    </div>
  );
}