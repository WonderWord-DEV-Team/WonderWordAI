"use client";

import React, { useState, useEffect } from "react";
import { LogOut, Volume2, Mic } from "lucide-react";

export default function ReadingModePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWorld, setSelectedWorld] = useState<string | null>("Space");
  const [isReading, setIsReading] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [showPracticePopup, setShowPracticePopup] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleToggleReading = () => {
    if (isReading) {
      setIsReading(false);
      setShowSuccess(true);
    } else {
      setIsReading(true);
    }
  };

  useEffect(() => {
    if (isReading) {
      const timer = setTimeout(() => {
        setShowBubble(true);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowBubble(false);
    }
  }, [isReading]);

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
      <main className="mx-auto w-full max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] px-6 py-16 flex-1 flex flex-col justify-center relative">
        {selectedWorld ? (
          showSuccess ? (
            /* STEP 3: SUCCESS COMPLETION VIEW */
            <div className="w-full animate-fadeIn relative flex flex-col items-center justify-center min-h-[600px] py-4">
              {/* Floating background decorations */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/Top Left Star.jpg" alt="Star" className="absolute left-[5%] top-[10%] w-[45px] h-auto opacity-50 select-none hidden md:block" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/Top Left Star.jpg" alt="Star" className="absolute right-[8%] top-[15%] w-[35px] h-auto opacity-40 select-none hidden md:block" />
              <div className="absolute left-[12%] bottom-[15%] text-4xl opacity-30 select-none hidden md:block">✏️</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/Top Left Star.jpg" alt="Star" className="absolute right-[5%] bottom-[10%] w-[55px] h-auto opacity-45 select-none hidden md:block" />
              <div className="absolute right-[15%] bottom-[30%] text-3xl opacity-30 select-none hidden md:block">✏️</div>

              <div className="flex flex-col lg:flex-row items-center justify-center gap-12 w-full max-w-[1250px] z-10">
                {/* Left Column: Monster & Congrats speech bubble */}
                <div className="relative shrink-0 flex items-start animate-fade-in">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/monster.svg"
                    alt="Monster"
                    className="h-48 w-auto"
                  />

                  {/* Congrats Speech Bubble */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-[105%] bg-white border border-[#ecdfc9] rounded-[16px] w-[158px] h-[71px] shadow-md text-[11px] leading-tight text-[#2b2b2b] font-body font-bold flex items-center justify-center p-3 text-center z-30 animate-fade-in -rotate-[0.43deg]">
                    {/* Tail of the bubble pointing down */}
                    <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-[#ecdfc9] rotate-45" />
                    Hurray, You are Amazing! 🌟
                  </div>
                </div>

                {/* Right Column: Main victory card */}
                <div className="bg-white border border-[#ecdfc9] rounded-[32px] w-full max-w-[768px] h-auto min-h-[736px] md:h-[736px] shadow-2xl flex flex-col items-center pt-12 pb-16 md:pt-16 md:pb-12 px-4 md:px-8 relative animate-fade-in">
                  {/* Header Title */}
                  <div className="text-center w-full mt-2 flex items-center justify-center gap-2">
                    <span className="w-[45px] h-[60px] flex items-center justify-center text-[48px] select-none leading-none">
                      🎉
                    </span>
                    <h2 className="text-[#ff6868] text-4xl sm:text-5xl font-black font-body tracking-tight">
                      You Did It!
                    </h2>
                  </div>

                  {/* Stat Capsules Podium */}
                  <div className="flex items-start justify-center gap-3 md:gap-6 w-full mt-10 md:mt-14 px-2 md:px-4 scale-[0.8] sm:scale-100 origin-center">
                    {/* Time Capsule */}
                    <div className="w-[128px] h-[220px] bg-[#ffa726] border-4 border-white rounded-full flex flex-col items-center justify-between pt-[32px] pb-[32px] px-3 text-white shadow-[0_4px_6px_-4px_rgba(0,0,0,0.1),0_10px_15px_-3px_rgba(0,0,0,0.1)] mt-[112px]">
                      <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center text-2xl shadow-xs">
                        🕒
                      </div>
                      <span className="text-[11px] font-black tracking-wider opacity-90 uppercase font-body mt-2">
                        TIME
                      </span>
                      <span className="text-3xl font-black font-body mb-1">
                        1:24
                      </span>
                    </div>

                    {/* Words Read Capsule (Podium Center - Taller Split Capsule) */}
                    <div className="w-[160px] h-[308px] flex flex-col items-center justify-between relative z-10 text-white rounded-[80px] shadow-[0_4px_6px_-4px_rgba(0,0,0,0.1),0_10px_15px_-3px_rgba(0,0,0,0.1)]">
                      {/* Top Half: Light green to teal gradient */}
                      <div className="w-[160px] h-[146px] bg-gradient-to-b from-[#80e5d9] to-[#4cd1c0] border-t-4 border-l-4 border-r-4 border-white rounded-t-[80px] flex items-center justify-center pt-[52px] pb-[36px] shrink-0">
                        <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center text-xl text-[#4cd1c0] shadow-md border-2 border-white">
                          ✅
                        </div>
                      </div>
                      {/* Thin white line separator */}
                      <div className="w-full h-[3px] bg-white opacity-95 shrink-0" />
                      {/* Bottom Half: Solid teal */}
                      <div className="w-[160px] h-[159px] bg-[#4cd1c0] border-b-4 border-l-4 border-r-4 border-white rounded-b-[80px] flex flex-col items-center justify-center pb-8 shrink-0">
                        <span className="text-xs font-black tracking-wider opacity-90 uppercase font-body mt-4">
                          WORDS READ
                        </span>
                        <span className="text-5xl font-black font-body mt-1">
                          31
                        </span>
                      </div>
                    </div>

                    {/* Accuracy Capsule */}
                    <div className="w-[128px] h-[220px] bg-[#ff6868] border-4 border-white rounded-full flex flex-col items-center justify-between pt-[32px] pb-[32px] px-3 text-white shadow-[0_4px_6px_-4px_rgba(0,0,0,0.1),0_10px_15px_-3px_rgba(0,0,0,0.1)] mt-[112px]">
                      <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center text-2xl shadow-xs">
                        🎯
                      </div>
                      <span className="text-[11px] font-black tracking-wider opacity-90 uppercase font-body mt-2">
                        ACCURACY
                      </span>
                      <span className="text-3xl font-black font-body mb-1">
                        87%
                      </span>
                    </div>
                  </div>

                  {/* Reward Section */}
                  <div className="flex flex-col items-center gap-3 mt-14 mb-8">
                    <div className="flex items-center gap-2 font-body shrink-0">
                      <span className="w-[189px] h-[40px] text-[36px] font-black leading-[40px] tracking-normal text-[#584140] inline-flex items-center">
                        +150 Stars
                      </span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/images/Top Left Star.jpg" alt="Star" className="w-[40px] h-[40px] object-contain shrink-0" />
                    </div>
                    <span className="bg-[#fffbe5] text-[#d48806] border border-[#ffe58f] text-xs font-extrabold px-4 py-1.5 rounded-full font-body flex items-center gap-1 shadow-xs">
                      🏅 Reading Star
                    </span>
                  </div>

                  {/* Action Buttons Row - Absolutelly positioned to overlap bottom border */}
                  <div className="relative md:absolute md:bottom-[-30px] left-0 right-0 flex flex-col min-[480px]:flex-row gap-6 justify-center items-center z-20 mt-10 md:mt-0">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSuccess(false);
                        setSelectedWorld(null);
                      }}
                      className="w-[331px] h-[60px] bg-[#4cd1c0] hover:bg-[#3dbdb3] active:scale-95 text-white text-xl font-extrabold rounded-full flex items-center justify-center gap-[12px] py-4 px-8 transition shadow-[0_8px_16px_rgba(0,0,0,0.15)] font-body shrink-0"
                    >
                      Back Home
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSuccess(false);
                        setIsReading(false);
                      }}
                      className="w-[331px] h-[60px] bg-[#ff6b6b] hover:bg-[#e85a5a] active:scale-95 text-white text-xl font-extrabold rounded-full flex items-center justify-center gap-[12px] py-4 px-8 transition shadow-[0_8px_16px_rgba(0,0,0,0.15)] font-body shrink-0"
                    >
                      Next Lesson
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* STEP 2: READING MODE DASHBOARD */
            <div className="w-full animate-fadeIn">
              {/* End Session Button */}
              <button
                onClick={() => {
                  setSelectedWorld(null);
                  setIsReading(false);
                  setShowBubble(false);
                  setShowErrorPopup(true);
                  setShowPracticePopup(false);
                }}
                className="flex items-center gap-2 text-[#a3352b] hover:text-[#c03d32] text-lg font-bold font-body mb-6 transition"
              >
                <LogOut className="h-5 w-5 transform rotate-180" /> End Session
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
                <div className="bg-[#ff9c55] rounded-[10px] p-6 text-white min-h-[120px] flex flex-col justify-between shadow-sm">
                  <span className="text-xs font-black tracking-wider opacity-90 font-body">TIME</span>
                  <span className="text-4xl font-bold mt-2 font-body">0:00</span>
                </div>

                {/* WORDS READ */}
                <div className="bg-[#4cd1c0] rounded-[10px] p-6 text-white min-h-[120px] flex flex-col justify-between shadow-sm">
                  <span className="text-xs font-black tracking-wider opacity-90 font-body">WORDS READ</span>
                  <span className="text-4xl font-bold mt-2 font-body">0</span>
                </div>

                {/* ACCURACY */}
                <div className="bg-[#ff6868] rounded-[10px] p-6 text-white min-h-[120px] flex flex-col justify-between shadow-sm">
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
                {/* Monster & Speech Bubble Wrapper */}
                <div className="relative shrink-0 z-[49] flex items-start">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/monster.svg"
                    alt="Monster"
                    className={`h-36 w-auto transition-all duration-300 ${showPracticePopup ? "translate-y-[100px] md:translate-y-0" : "translate-y-0"
                      }`}
                  />

                  {/* Speech Bubble */}
                  {showBubble && !showErrorPopup && !showPracticePopup && (
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-[105%] bg-white border border-[#ecdfc9] rounded-[16px] w-[158px] h-[71px] shadow-md text-[11px] leading-tight text-[#2b2b2b] font-body font-bold flex items-center justify-center p-3 text-center z-30 animate-fade-in -rotate-[0.43deg]">
                      {/* Tail of the bubble pointing down */}
                      <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-[#ecdfc9]/80 rotate-45" />
                      You're doing great, Emma! Keep going! 🌟
                    </div>
                  )}
                </div>

                {/* Centered Start Button */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-8 z-20">
                  <button
                    onClick={handleToggleReading}
                    className={`text-white py-4 px-10 rounded-[24px] font-extrabold text-xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-md whitespace-nowrap font-body min-w-[340px] ${isReading ? "bg-black hover:bg-zinc-900" : "bg-[#ff6868] hover:bg-[#ef5353]"
                      }`}
                  >
                    {isReading ? (
                      <>
                        <span className="w-3.5 h-3.5 bg-white inline-block" /> Stop reading
                      </>
                    ) : (
                      <>
                        <span>🎤</span> Start Read It Aloud
                      </>
                    )}
                  </button>
                </div>

                {/* Invisible placeholder to balance layout */}
                <div className="h-36 w-36 hidden sm:block pointer-events-none" />
              </div>

              {/* Error Popup Modal */}
              {showErrorPopup && (
                <>
                  {/* Backdrop */}
                  <div className="fixed inset-0 bg-black/40 z-40" />

                  {/* Modal Card positioned next to the monster */}
                  <div className="absolute left-4 right-4 md:left-[130px] md:right-auto md:w-[440px] bottom-[150px] z-[48] bg-[#f4f7f6] border border-[#ecdfc9] rounded-[36px] shadow-2xl flex flex-col items-center animate-fade-in">
                    {/* Title & Subtitle with Header Background Band */}
                    <div className="text-center w-full py-6 px-6 bg-[#fff2f2] border-b border-[#ecdfc9]/60 rounded-t-[34px]">
                      <h2 className="text-[#a3352b] text-3xl font-extrabold font-body">
                        Oops, let's try that again!
                      </h2>
                      <p className="text-xs font-bold text-[#8a8a8a] mt-1.5 font-body">
                        You read a different word. No worries!
                      </p>
                    </div>

                    {/* Body Container (padded) */}
                    <div className="w-full px-6 pb-6 pt-2 flex flex-col items-center">
                      {/* Word Comparison (You Said vs The Word Is) */}
                      <div className="flex justify-center gap-6 w-full mt-4 relative">
                        {/* Left Column: You said */}
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-bold text-[#8a8a8a] mb-2 font-body">You said</span>
                          <span className="bg-[#fbeceb] text-[#a3352b] border border-[#a3352b] text-2xl font-black px-1 py-0.1 rounded-full font-body mb-3">
                            Glass
                          </span>
                          <div className="w-[100px] h-[100px] bg-white border border-black rounded-[16px] p-2 flex items-center justify-center shadow-xs">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/images/glass.png" alt="Glass illustration" className="max-w-full max-h-full object-contain" />
                          </div>
                        </div>

                        {/* Right Column: The word is */}
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-bold text-[#8a8a8a] mb-2 font-body">The word is</span>
                          <span className="bg-[#ecfbf0] text-[#10a84e] border border-[#10a84e] text-2xl font-black px-1 py-0.1 rounded-full font-body mb-3">
                            Grass
                          </span>
                          <div className="w-[100px] h-[100px] bg-white border border-black rounded-[16px] p-2 flex items-center justify-center shadow-xs">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/images/grass.png" alt="Grass illustration" className="max-w-full max-h-full object-contain" />
                          </div>
                        </div>

                        {/* Speak/Listen Button */}
                        <button className="absolute right-[-24px] md:right-[-10px] top-[-10px] md:top-[-5px] bg-white hover:bg-slate-50 text-black text-sm font-extrabold w-[96px] h-[76px] rounded-full flex items-center justify-center pt-[4px] pb-[4px] pl-[12px] pr-[12px] gap-[4px] shadow-sm transition">
                          <Volume2 className="h-5 w-5 text-black" />
                          <span>Listen</span>
                        </button>
                      </div>

                      {/* Word Explanation Box */}
                      <div className="w-full max-w-[310px] bg-white border border-[#ecdfc9] rounded-[16px] p-4 mt-6 text-sm text-[#2b2b2b] text-start shadow-xs">
                        <p className="font-body leading-relaxed">
                          <strong className="font-black text-black">Grass</strong> is the soft green plant you see in gardens and parks. It grows in the ground and tickles your feet! 🌱
                        </p>
                      </div>

                      {/* Word Context Sentence Box */}
                      <div className="w-full max-w-[310px] bg-[#fffbeb] border border-[#fde68a] rounded-[16px] p-4 mt-4 text-sm text-[#8c584c] text-start shadow-xs">
                        <p className="font-body leading-relaxed">
                          The fox loved rolling in the tall green <strong className="font-black uppercase text-[#8c584c]">grass</strong> — say it with him: gr... gr... <strong className="font-black uppercase text-[#8c584c]">grass</strong>! 🦊
                        </p>
                      </div>

                      {/* Next Button */}
                      <button
                        onClick={() => {
                          setShowErrorPopup(false);
                          setShowPracticePopup(true);
                        }}
                        className="bg-black hover:bg-zinc-900 active:scale-95 text-white font-extrabold text-3xl font-body py-3 px-10 rounded-[12px] mt-6 shadow-md transition flex items-center justify-center gap-2"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Let's Practice Popup Modal */}
              {showPracticePopup && (
                <>
                  {/* Backdrop */}
                  <div className="fixed inset-0 bg-black/40 z-40" />

                  {/* Modal Card positioned next to the monster */}
                  <div className="absolute left-4 right-4 md:left-[130px] md:right-auto md:w-full md:max-w-[990px] h-auto min-h-[561px] md:h-[561px] bottom-[80px] z-[48] bg-[#f4f7f6] border border-[#ecdfc9] rounded-[10px] shadow-2xl flex flex-col items-center animate-fade-in">
                    {/* Title & Subtitle with Header Background Band */}
                    <div className="text-center w-full py-6 px-6 bg-[#fff2f2] border-b border-[#ecdfc9]/60 rounded-t-[10px]">
                      <h2 className="text-[#a3352b] text-3xl font-extrabold font-body">
                        Let's practice
                      </h2>
                      <p className="text-xs font-bold text-[#8a8a8a] mt-1.5 font-body">
                        Let's practice reading <strong className="text-[#10a84e] font-black">grass</strong>
                      </p>
                    </div>

                    {/* Body Container */}
                    <div className="w-full px-4 pb-6 pt-4 md:px-8 md:pb-8 md:pt-6 flex-1 flex flex-col justify-center items-center">
                      <div className="flex flex-col sm:flex-row gap-8 items-center justify-center w-full">
                        {/* Left Column: Solid green illustration card */}
                        <div className="w-full sm:w-[220px] h-[150px] sm:h-[303px] rounded-[10px] bg-[#10a84e] shrink-0" />

                        {/* Right Column: Contains the bordered text box and buttons */}
                        <div className="w-full sm:w-[537px] flex flex-col gap-6 shrink-0 sm:shrink">
                          {/* Bordered explanation text box */}
                          <div className="border border-[#ecdfc9] bg-white rounded-[10px] p-4 sm:pt-[10px] sm:pr-[10px] sm:pb-[10px] sm:pl-[28px] h-auto min-h-[223px] sm:h-[223px] text-xl sm:text-2xl text-[#2b2b2b] leading-relaxed text-start font-body font-medium shadow-xs flex items-center">
                            <p>
                              Emma ran through the tall green{" "}
                              <strong className="text-[#10a84e] font-black">grass</strong> in her
                              backyard, feeling it tickle her toes with every step. She flopped
                              down and looked up at the sky — the soft{" "}
                              <strong className="text-[#10a84e] font-black">grass</strong> felt
                              just like a giant green pillow!
                            </p>
                          </div>

                          {/* Action buttons row */}
                          <div className="flex flex-col min-[480px]:flex-row gap-4 w-full justify-center items-center">
                            <button
                              type="button"
                              className="w-full sm:w-[278px] h-[68px] bg-[#4ecdc4] hover:bg-[#3dbdb3] active:scale-95 text-white text-xl font-extrabold rounded-full flex items-center justify-center gap-2 transition shadow-sm font-body shrink-0"
                            >
                              <Volume2 className="h-6 w-6" />
                              Hear it again
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsReading(!isReading)}
                              className={`w-full sm:w-[278px] h-[68px] text-white text-xl font-extrabold rounded-full flex items-center justify-center gap-3 active:scale-95 transition-all shadow-sm font-body shrink-0 ${isReading ? "bg-black hover:bg-zinc-900" : "bg-[#ff6b6b] hover:bg-[#e85a5a]"
                                }`}
                            >
                              {isReading ? (
                                <>
                                  <span className="w-3.5 h-3.5 bg-white inline-block" />
                                  Stop reading
                                </>
                              ) : (
                                <>
                                  <Mic className="h-6 w-6" />
                                  Try it again!
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )
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
                className="bg-[#2260e6] rounded-[24px] sm:rounded-[36px] pt-4 pb-6 sm:pb-8 px-3 sm:px-4 flex flex-col items-center justify-between text-center min-h-[250px] sm:min-h-[320px] shadow-sm hover:scale-[1.03] hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-full bg-white/20 flex items-center justify-center mt-4 sm:mt-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/rocket.svg" alt="Space icon" className="h-10 w-10 sm:h-16 sm:w-16 object-contain" />
                </div>
                <div className="w-full flex flex-col items-center gap-2 sm:gap-2.5">
                  <span className="text-white text-lg sm:text-xl font-bold font-body">Space</span>
                  <button className="w-full bg-white text-[#2260e6] py-2 px-3 sm:py-3 sm:px-4 rounded-full font-extrabold text-xs sm:text-base font-body transition hover:bg-slate-50">
                    Blast off →
                  </button>
                </div>
              </div>

              {/* Card 2: Dinos */}
              <div
                onClick={() => setSelectedWorld("Dinos")}
                className="bg-[#10a84e] rounded-[24px] sm:rounded-[36px] pt-4 pb-6 sm:pb-8 px-3 sm:px-4 flex flex-col items-center justify-between text-center min-h-[250px] sm:min-h-[320px] shadow-sm hover:scale-[1.03] hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-full bg-white/20 flex items-center justify-center mt-4 sm:mt-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/paw.svg" alt="Dinos icon" className="h-10 w-10 sm:h-16 sm:w-16 object-contain" />
                </div>
                <div className="w-full flex flex-col items-center gap-2 sm:gap-2.5">
                  <span className="text-white text-lg sm:text-xl font-bold font-body">Dinos</span>
                  <button className="w-full bg-white text-[#10a84e] py-2 px-3 sm:py-3 sm:px-4 rounded-full font-extrabold text-xs sm:text-base font-body transition hover:bg-slate-50">
                    Roar in →
                  </button>
                </div>
              </div>

              {/* Card 3: Fairy Tale */}
              <div
                onClick={() => setSelectedWorld("Fairy Tale")}
                className="bg-[#d2237d] rounded-[24px] sm:rounded-[36px] pt-4 pb-6 sm:pb-8 px-3 sm:px-4 flex flex-col items-center justify-between text-center min-h-[250px] sm:min-h-[320px] shadow-sm hover:scale-[1.03] hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-full bg-white/20 flex items-center justify-center mt-4 sm:mt-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/castle.svg" alt="Fairy Tale icon" className="h-10 w-10 sm:h-16 sm:w-16 object-contain" />
                </div>
                <div className="w-full flex flex-col items-center gap-2 sm:gap-2.5">
                  <span className="text-white text-lg sm:text-xl font-bold font-body">Fairy Tale</span>
                  <button className="w-full bg-white text-[#d2237d] py-2 px-3 sm:py-3 sm:px-4 rounded-full font-extrabold text-xs sm:text-base font-body transition hover:bg-slate-50">
                    Believe →
                  </button>
                </div>
              </div>

              {/* Card 4: Heroes */}
              <div
                onClick={() => setSelectedWorld("Heroes")}
                className="bg-[#e65100] rounded-[24px] sm:rounded-[36px] pt-4 pb-6 sm:pb-8 px-3 sm:px-4 flex flex-col items-center justify-between text-center min-h-[250px] sm:min-h-[320px] shadow-sm hover:scale-[1.03] hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-full bg-white/20 flex items-center justify-center mt-4 sm:mt-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/mask.svg" alt="Heroes icon" className="h-10 w-10 sm:h-16 sm:w-16 object-contain" />
                </div>
                <div className="w-full flex flex-col items-center gap-2 sm:gap-2.5">
                  <span className="text-white text-lg sm:text-xl font-bold font-body">Heroes</span>
                  <button className="w-full bg-white text-[#e65100] py-2 px-3 sm:py-3 sm:px-4 rounded-full font-extrabold text-xs sm:text-base font-body transition hover:bg-slate-50">
                    Save day →
                  </button>
                </div>
              </div>

              {/* Card 5: Food */}
              <div
                onClick={() => setSelectedWorld("Food")}
                className="bg-[#6b21a8] rounded-[24px] sm:rounded-[36px] pt-4 pb-6 sm:pb-8 px-3 sm:px-4 flex flex-col items-center justify-between text-center min-h-[250px] sm:min-h-[320px] shadow-sm hover:scale-[1.03] hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-full bg-white/20 flex items-center justify-center mt-4 sm:mt-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/hat.svg" alt="Food icon" className="h-10 w-10 sm:h-16 sm:w-16 object-contain" />
                </div>
                <div className="w-full flex flex-col items-center gap-2 sm:gap-2.5">
                  <span className="text-white text-lg sm:text-xl font-bold font-body">Food</span>
                  <button className="w-full bg-white text-[#6b21a8] py-2 px-3 sm:py-3 sm:px-4 rounded-full font-extrabold text-xs sm:text-base font-body transition hover:bg-slate-50">
                    Taste it →
                  </button>
                </div>
              </div>

              {/* Card 6: Animals */}
              <div
                onClick={() => setSelectedWorld("Animals")}
                className="bg-[#e6a100] rounded-[24px] sm:rounded-[36px] pt-4 pb-6 sm:pb-8 px-3 sm:px-4 flex flex-col items-center justify-between text-center min-h-[250px] sm:min-h-[320px] shadow-sm hover:scale-[1.03] hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-full bg-white/20 flex items-center justify-center mt-4 sm:mt-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/barn.svg" alt="Animals icon" className="h-10 w-10 sm:h-16 sm:w-16 object-contain" />
                </div>
                <div className="w-full flex flex-col items-center gap-2 sm:gap-2.5">
                  <span className="text-white text-lg sm:text-xl font-bold font-body">Animals</span>
                  <button className="w-full bg-white text-[#e6a100] py-2 px-3 sm:py-3 sm:px-4 rounded-full font-extrabold text-xs sm:text-base font-body transition hover:bg-slate-50">
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
            <p className="ml-1">© 2026 WonderWord AI.</p>
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
      {/* Error Popup Modal Backdrop removed from here and moved inside main */}
    </div>
  );
}
