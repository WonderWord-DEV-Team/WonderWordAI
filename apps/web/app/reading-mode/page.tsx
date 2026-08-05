"use client";

import React, { useState, useEffect } from "react";

export default function ReadingModePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWorld, setSelectedWorld] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#FDFAF5]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/loader.svg"
          alt="Loading..."
          className="h-32 w-32 animate-spin"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFAF5] text-[#2b2b2b] flex flex-col justify-between">
      {/* ---------------------------------------------------------------- */}
      {/* Header                                                          */}
      {/* ---------------------------------------------------------------- */}
      <header className="border-b border-[#ecdfc9] bg-white">
        <div className="mx-auto flex max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] items-center justify-between px-6 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="WonderWord AI" className="h-8 w-auto" />

          <nav className="absolute left-1/2 hidden -translate-x-1/2 gap-8 text-sm font-medium text-[#4a4a4a] md:flex">
            <a href="#" className="hover:text-[#2b2b2b]">
              Home
            </a>
            <a href="#" className="hover:text-[#2b2b2b]">
              Story Library
            </a>
            <a href="#" className="hover:text-[#2b2b2b]">
              Store
            </a>
            <a href="#" className="hover:text-[#2b2b2b]">
              Diagnostics
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-600">
              <span>⭐</span>
              1,240
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-300 to-pink-300" />
              <span className="text-sm font-medium">Emma</span>
            </div>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Main Content                                                    */}
      {/* ---------------------------------------------------------------- */}
      <main className="mx-auto w-full max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] px-6 py-16 flex-1 flex flex-col justify-center">
        {selectedWorld ? (
          /* STEP 2: READING MODE DASHBOARD */
          <div className="w-full animate-fadeIn">
            {/* End Session Button */}
            <button
              onClick={() => setSelectedWorld(null)}
              className="flex items-center gap-2 text-[#a3352b] hover:text-[#c03d32] text-lg font-bold font-body mb-6 transition"
            >
              <span className="text-xl">🚪</span> End Session
            </button>

            {/* Title & Subtitle */}
            <div className="mb-8">
              <h1 className="text-4xl font-extrabold text-[#2b2b2b] tracking-tight sm:text-5xl font-body">
                Reading Mode
              </h1>
              <p className="mt-2 text-lg text-[#8a8a8a] font-body">
                Tap “Start reading” when you’re ready
              </p>
            </div>

            {/* Dashboard Cards (TIME, WORDS READ, ACCURACY) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 w-full">
              {/* TIME */}
              <div className="bg-[#ff9c55] rounded-[24px] p-6 text-white min-h-[120px] flex flex-col justify-between shadow-sm">
                <span className="text-xs font-black tracking-wider opacity-90 font-body">TIME</span>
                <span className="text-4xl font-bold mt-2 font-body">0:00</span>
              </div>

              {/* WORDS READ */}
              <div className="bg-[#4cd1c0] rounded-[24px] p-6 text-white min-h-[120px] flex flex-col justify-between shadow-sm">
                <span className="text-xs font-black tracking-wider opacity-90 font-body">WORDS READ</span>
                <span className="text-4xl font-bold mt-2 font-body">0</span>
              </div>

              {/* ACCURACY */}
              <div className="bg-[#ff6868] rounded-[24px] p-6 text-white min-h-[120px] flex flex-col justify-between shadow-sm">
                <span className="text-xs font-black tracking-wider opacity-90 font-body">ACCURACY</span>
                <span className="text-4xl font-bold mt-2 font-body">--</span>
              </div>
            </div>

            {/* Story Text Card Container */}
            <div className="bg-white rounded-[24px] p-8 md:p-10 border border-[#ecdfc9]/60 shadow-sm relative mb-8">
              <span className="text-base font-extrabold text-[#8c584c] block mb-4 font-body">
                Story Name
              </span>
              <p className="text-3xl font-extrabold text-[#8a8a8a] leading-[1.65] font-body tracking-tight">
                <span className="text-[#ff6868] bg-[#ff6868]/10 px-3 py-1 rounded-[12px] mr-1.5 inline-block font-extrabold">The</span>
                small red fox near a big oak tree at the end of a long dirt path. Every day, he would wake up early and run through the tall green grass to find his breakfast. One bright morning, he spotted a blue bird
              </p>
            </div>

            {/* Bottom Actions Row (Monster and Mic Button) */}
            <div className="flex items-end justify-between relative mt-16 min-h-[140px]">
              {/* Monster SVG */}
              <div className="shrink-0 z-10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/monster.svg"
                  alt="Monster"
                  className="h-36 w-auto"
                />
              </div>

              {/* Centered Start Button */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-0 z-20">
                <button className="bg-[#ff6868] text-white py-4 px-10 rounded-[24px] font-extrabold text-xl flex items-center justify-center gap-3 hover:bg-[#ef5353] active:scale-95 transition-all shadow-md whitespace-nowrap font-body">
                  <span>🎤</span> Start Read It Aloud
                </button>
              </div>

              {/* Invisible placeholder to balance layout */}
              <div className="h-36 w-36 hidden sm:block pointer-events-none" />
            </div>
          </div>
        ) : (
          /* STEP 1: CHOOSE YOUR ADVENTURE */
          <>
            {/* Section Title */}
            <div className="mb-10 text-start">
              <h1 className="text-4xl font-extrabold text-[#2b2b2b] tracking-tight sm:text-5xl font-body">
                Choose Your Adventure!
              </h1>
              <p className="mt-2 text-lg text-[#5a5a5a]">
                Every story is built from your imagination — pick a world!
              </p>
            </div>

            {/* Adventure Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 w-full">
              {/* Card 1: Space */}
              <div
                onClick={() => setSelectedWorld("Space")}
                className="bg-[#2260e6] rounded-[36px] pt-4 pb-8 px-4 flex flex-col items-center justify-between text-center min-h-[320px] shadow-sm hover:scale-[1.03] hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center mt-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/rocket.svg" alt="Space icon" className="h-16 w-16 object-contain" />
                </div>
                <div className="w-full flex flex-col items-center gap-2.5">
                  <span className="text-white text-xl font-bold font-body">Space</span>
                  <button className="w-full bg-white text-[#2260e6] py-3 px-4 rounded-full font-extrabold text-base font-body transition hover:bg-slate-50">
                    Blast off →
                  </button>
                </div>
              </div>

              {/* Card 2: Dinos */}
              <div
                onClick={() => setSelectedWorld("Dinos")}
                className="bg-[#10a84e] rounded-[36px] pt-4 pb-8 px-4 flex flex-col items-center justify-between text-center min-h-[320px] shadow-sm hover:scale-[1.03] hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center mt-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/paw.svg" alt="Dinos icon" className="h-16 w-16 object-contain" />
                </div>
                <div className="w-full flex flex-col items-center gap-2.5">
                  <span className="text-white text-xl font-bold font-body">Dinos</span>
                  <button className="w-full bg-white text-[#10a84e] py-3 px-4 rounded-full font-extrabold text-base font-body transition hover:bg-slate-50">
                    Roar in →
                  </button>
                </div>
              </div>

              {/* Card 3: Fairy Tale */}
              <div
                onClick={() => setSelectedWorld("Fairy Tale")}
                className="bg-[#d2237d] rounded-[36px] pt-4 pb-8 px-4 flex flex-col items-center justify-between text-center min-h-[320px] shadow-sm hover:scale-[1.03] hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center mt-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/castle.svg" alt="Fairy Tale icon" className="h-16 w-16 object-contain" />
                </div>
                <div className="w-full flex flex-col items-center gap-2.5">
                  <span className="text-white text-xl font-bold font-body">Fairy Tale</span>
                  <button className="w-full bg-white text-[#d2237d] py-3 px-4 rounded-full font-extrabold text-base font-body transition hover:bg-slate-50">
                    Believe →
                  </button>
                </div>
              </div>

              {/* Card 4: Heroes */}
              <div
                onClick={() => setSelectedWorld("Heroes")}
                className="bg-[#e65100] rounded-[36px] pt-4 pb-8 px-4 flex flex-col items-center justify-between text-center min-h-[320px] shadow-sm hover:scale-[1.03] hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center mt-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/mask.svg" alt="Heroes icon" className="h-16 w-16 object-contain" />
                </div>
                <div className="w-full flex flex-col items-center gap-2.5">
                  <span className="text-white text-xl font-bold font-body">Heroes</span>
                  <button className="w-full bg-white text-[#e65100] py-3 px-4 rounded-full font-extrabold text-base font-body transition hover:bg-slate-50">
                    Save day →
                  </button>
                </div>
              </div>

              {/* Card 5: Food */}
              <div
                onClick={() => setSelectedWorld("Food")}
                className="bg-[#6b21a8] rounded-[36px] pt-4 pb-8 px-4 flex flex-col items-center justify-between text-center min-h-[320px] shadow-sm hover:scale-[1.03] hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center mt-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/hat.svg" alt="Food icon" className="h-16 w-16 object-contain" />
                </div>
                <div className="w-full flex flex-col items-center gap-2.5">
                  <span className="text-white text-xl font-bold font-body">Food</span>
                  <button className="w-full bg-white text-[#6b21a8] py-3 px-4 rounded-full font-extrabold text-base font-body transition hover:bg-slate-50">
                    Taste it →
                  </button>
                </div>
              </div>

              {/* Card 6: Animals */}
              <div
                onClick={() => setSelectedWorld("Animals")}
                className="bg-[#e6a100] rounded-[36px] pt-4 pb-8 px-4 flex flex-col items-center justify-between text-center min-h-[320px] shadow-sm hover:scale-[1.03] hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center mt-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/barn.svg" alt="Animals icon" className="h-16 w-16 object-contain" />
                </div>
                <div className="w-full flex flex-col items-center gap-2.5">
                  <span className="text-white text-xl font-bold font-body">Animals</span>
                  <button className="w-full bg-white text-[#e6a100] py-3 px-4 rounded-full font-extrabold text-base font-body transition hover:bg-slate-50">
                    Meet them →
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ---------------------------------------------------------------- */}
      {/* Footer                                                           */}
      {/* ---------------------------------------------------------------- */}
      <footer className="border-t border-[#f0e6d8] bg-white py-8">
        <div className="mx-auto flex max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] flex-col items-center justify-between gap-4 px-6 text-sm text-[#8a8a8a] md:flex-row">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="WonderWord AI" className="h-6 w-auto opacity-80" />
            <p className="ml-1">© 2024 WonderWord AI.</p>
          </div>
          <div className="flex gap-5">
            <a href="#" className="hover:text-[#2b2b2b]">
              Privacy
            </a>
            <a href="#" className="hover:text-[#2b2b2b]">
              Terms
            </a>
            <a href="#" className="hover:text-[#2b2b2b]">
              Support
            </a>
            <a href="#" className="hover:text-[#2b2b2b]">
              About Us
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
