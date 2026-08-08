"use client";

import React, { useState } from "react";
import Link from "next/link";
import { LogOut, Volume2, X, Sparkles, Smile, ShieldCheck, Users } from "lucide-react";

// Definitions list that can easily be fetched from database/API in the future
type DefinitionData = {
  definition: string;
  color: string;
  emoji: string;
};

const MOCK_DEFINITIONS: Record<string, DefinitionData> = {
  grass: {
    definition: "is the soft green plant you see in gardens and parks. It grows in the ground and tickles your feet!",
    color: "#3ECF8E",
    emoji: "🌱"
  },
  shark: {
    definition: "is a big fish that lives in the ocean. They have lots of sharp teeth and swim very fast!",
    color: "#38bdf8",
    emoji: "🦈"
  },
  star: {
    definition: "is a tiny light shining in the night sky. They are far, far away in space, like little diamonds!",
    color: "#fbbf24",
    emoji: "⭐"
  },
  cat: {
    definition: "is a small furry animal with whiskers and a tail that says meow. They love to take naps and chase yarn!",
    color: "#fb923c",
    emoji: "🐱"
  }
};

const fallbackDefinition = (word: string): DefinitionData => ({
  definition: `is a wonderful word that we can read and explore! Let's practice saying it together to learn its special sound.`,
  color: "#10998f",
  emoji: "✨"
});

export default function WordExplorerPage() {
  // Mock states that can easily be loaded from backend/props in the future
  const [userProfile, setUserProfile] = useState({
    name: "Emma",
    starsCount: 1240,
    avatarGradient: "from-orange-300 to-pink-300"
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [submittedWord, setSubmittedWord] = useState<string | null>(null);
  const [definition, setDefinition] = useState<DefinitionData | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Handles typing and submitting search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    const query = searchTerm.trim().toLowerCase();
    const result = MOCK_DEFINITIONS[query] || fallbackDefinition(searchTerm.trim());

    setSubmittedWord(searchTerm.trim());
    setDefinition(result);
    setHasSearched(true);
  };

  const handleClear = () => {
    setSearchTerm("");
    setSubmittedWord(null);
    setDefinition(null);
    setHasSearched(false);
  };

  const handleFinish = () => {
    // When finish is clicked, increase stars count and clear search
    setUserProfile((prev) => ({
      ...prev,
      starsCount: prev.starsCount + 20
    }));
    handleClear();
  };

  return (
    <div className="min-h-screen bg-[#FDFAF5] text-[#2b2b2b] flex flex-col justify-between font-body">
      {/* ---------------------------------------------------------------- */}
      {/* Header                                                          */}
      {/* ---------------------------------------------------------------- */}
      <header className="border-b border-[#ecdfc9] bg-white">
        <div className="mx-auto flex max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] items-center justify-between px-6 py-4">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="WonderWord AI" className="h-8 w-auto cursor-pointer" />
          </Link>

          <nav className="absolute left-1/2 hidden -translate-x-1/2 gap-8 text-sm font-medium text-[#4a4a4a] md:flex">
            <a href="#" className="hover:text-[#2b2b2b]">
              Home
            </a>
            <a href="#" className="border-b-2 border-[#a3352b] pb-1 font-bold text-[#2b2b2b]">
              Word Tools
            </a>
            <a href="#" className="hover:text-[#2b2b2b]">
              Story Library
            </a>
            <a href="#" className="hover:text-[#2b2b2b]">
              Activities
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-600">
              <svg className="h-4 w-4 fill-[#fbbf24]" viewBox="0 0 24 24">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
              {userProfile.starsCount.toLocaleString()}
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${userProfile.avatarGradient}`} />
              <span className="text-sm font-medium">{userProfile.name}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Main Content                                                    */}
      {/* ---------------------------------------------------------------- */}
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-6 md:px-[200px] py-12 flex flex-col justify-center items-start">
        {/* End Session back-nav link */}
        <div className="w-full flex justify-start mb-6">
          <Link href="/child/demo-session/read" className="flex items-center gap-2 text-sm font-bold text-[#a3352b] hover:text-[#8c2c23] transition-colors">
            <LogOut className="h-4 w-4 transform rotate-180" />
            End Session
          </Link>
        </div>

        {/* Title & Search Container */}
        <div className="w-full flex flex-col justify-start items-start gap-8 md:gap-[60px] opacity-100 mb-12">
          {/* Title */}
          <div className="text-start">
            <h1 className="text-4xl font-serif font-bold text-[#a3352b] tracking-tight sm:text-5xl font-body">
              Word Explorer
            </h1>
            <p className="mt-2 text-lg text-[#5a5a5a]">
              Type any word to discover its secret meaning!
            </p>
          </div>

          {/* Search Input Bar */}
          <form onSubmit={handleSearch} className="w-full max-w-[800px] self-center relative">
            <div className="relative flex items-center bg-white border border-[#ecdfc9] rounded-full px-6 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_24px_rgba(163,53,43,0.04)] focus-within:border-[#a3352b]/50 transition duration-200">
              <input
                type="text"
                placeholder="Type a word..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent outline-none text-xl text-[#2b2b2b] placeholder-slate-400 font-medium pr-10"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-6 text-[#2b2b2b] transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-6 w-6" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* -------------------------------------------------------------- */}
        {/* Popup Card (Mock search response card)                          */}
        {/* -------------------------------------------------------------- */}
        {hasSearched && submittedWord && definition && (
          <div className="w-full max-w-[990px] flex flex-col items-start animate-fade-in">
            {/* Main Word Box Popup */}
            <div className="w-full h-auto bg-white border border-[#ecdfc9] rounded-[10px] overflow-hidden shadow-[0_12px_36px_rgba(0,0,0,0.05)] flex flex-col">
              {/* Card Banner Header */}
              <div className="bg-[#bcdfc1] py-5 text-center border-b border-[#ecdfc9]">
                <h2 className="text-3xl font-extrabold text-[#12695a] capitalize">
                  {submittedWord}
                </h2>
              </div>

              {/* Card Content Body */}
              <div className="p-8 flex flex-col sm:flex-row gap-8 items-stretch">
                {/* Left side: Illustration preview color block (solid color rectangle) */}
                <div
                  className="w-full sm:w-[220px] min-h-[220px] sm:min-h-0 rounded-[10px] transition-colors duration-300"
                  style={{ backgroundColor: definition.color }}
                />

                {/* Right side: Contains the bordered text box and buttons */}
                <div className="flex-1 flex flex-col justify-between gap-6">
                  {/* Bordered explanation text box */}
                  <div className="border border-[#ecdfc9] bg-white rounded-[10px] p-6 flex-1 flex items-center">
                    <p className="text-2xl leading-relaxed text-[#2b2b2b]">
                      <span className="font-extrabold capitalize">{submittedWord} </span>
                      {definition.definition} <span className="inline-block ml-1">{definition.emoji}</span>
                    </p>
                  </div>

                  {/* Buttons group below the text box */}
                  <div className="flex flex-col min-[480px]:flex-row gap-4">
                    <button
                      type="button"
                      className="flex-1 min-h-[56px] bg-[#4ecdc4] hover:bg-[#3dbdb3] text-white text-xl font-extrabold px-6 py-3 rounded-full flex items-center justify-center gap-2 transition shadow-sm"
                    >
                      <Volume2 className="h-6 w-6" />
                      Hear it again
                    </button>
                    <button
                      type="button"
                      onClick={handleFinish}
                      className="flex-1 min-h-[56px] bg-[#ff6b6b] hover:bg-[#e85a5a] text-white text-xl font-extrabold px-6 py-3 rounded-full flex items-center justify-center gap-2 transition shadow-sm"
                    >
                      Finish
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* +20 Stars badge below popup */}
            <div className="w-full mt-6 flex items-center justify-center gap-2 text-3xl font-black text-[#2b2b2b] tracking-tight">
              +20 Stars
              <svg className="h-8 w-8 fill-[#fbbf24]" viewBox="0 0 24 24">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            </div>
          </div>
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
            <p className="ml-1 mt-1">© 2026 WonderWord AI.</p>
          </div>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-[#2b2b2b]">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[#2b2b2b]">
              Terms
            </Link>
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
