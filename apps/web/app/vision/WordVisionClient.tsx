"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, Palette } from "lucide-react";

export function WordVisionClient({ childName }: { childName: string }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [submittedWord, setSubmittedWord] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchTerm.trim();
    if (!query || isLoading) return;

    setIsLoading(true);
    setError(null);
    setSubmittedWord(query);
    setImageUrl(null);

    try {
      // mode: "openai" is forced on purpose — Word Vision always generates a
      // fresh, colorful, kid-friendly illustration. It never falls back to
      // Unsplash (real photos), unlike Word Explorer's "auto" mode.
      const response = await fetch("/api/illustrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: query, mode: "openai" })
      });

      if (!response.ok) throw new Error("generation failed");

      const body = await response.json();
      if (!body.url) throw new Error("no image returned");

      setImageUrl(body.url);
    } catch (err) {
      console.error("Word Vision generation failed.", err);
      setError("Wonder couldn't draw that one — try another word!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTryAnother = () => {
    setSearchTerm("");
    setSubmittedWord(null);
    setImageUrl(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#FDFAF5] text-[#2b2b2b] flex flex-col justify-between font-body">
      {/* ---------------------------------------------------------------- */}
      {/* Header                                                          */}
      {/* ---------------------------------------------------------------- */}
      <header className="border-b border-[#ecdfc9] bg-white">
        <div className="mx-auto flex max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] items-center justify-between px-6 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="WonderWord AI" className="h-8 w-auto" />

          <nav className="absolute left-1/2 hidden -translate-x-1/2 gap-8 text-sm font-medium text-[#4a4a4a] md:flex">
            <a href="/child" className="hover:text-[#2b2b2b]">Home</a>
            <a href="#" className="hover:text-[#2b2b2b]">Story Library</a>
            <a href="#" className="hover:text-[#2b2b2b]">Store</a>
            <a href="#" className="hover:text-[#2b2b2b]">Diagnostics</a>
          </nav>

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 to-pink-300 text-xs font-black text-white">
              {childName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium">{childName}</span>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Main Content                                                    */}
      {/* ---------------------------------------------------------------- */}
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-6 md:px-[200px] py-12 flex flex-col justify-center items-start">
        <div className="w-full flex justify-start mb-6">
          <Link href="/child" className="flex items-center gap-2 text-sm font-bold text-[#a3352b] hover:text-[#8c2c23] transition-colors">
            <LogOut className="h-4 w-4 transform rotate-180" />
            End Session
          </Link>
        </div>

        <div className="w-full flex flex-col justify-start items-start gap-8 md:gap-[60px] opacity-100 mb-12">
          <div className="text-start">
            <h1 className="font-serif text-4xl font-bold text-[#a3352b] md:text-5xl">
              Word Vision
            </h1>
            <p className="mt-2 text-lg text-[#5a5a5a]">
              Type a word and Wonder will show you a picture of it!
            </p>
          </div>

          <form onSubmit={handleGenerate} className="w-full max-w-[800px] self-center relative">
            <div className="relative flex items-center gap-3 rounded-full border border-[#ecdfc9] bg-white px-3 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition duration-200 focus-within:border-[#a3352b]/50">
              <input
                type="text"
                placeholder="Type a word..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isLoading}
                className="flex-1 bg-transparent pl-3 text-xl font-medium text-[#2b2b2b] placeholder-slate-400 outline-none"
              />
              <button
                type="submit"
                disabled={isLoading || !searchTerm.trim()}
                className="flex items-center gap-2 rounded-full bg-[#ff6868] px-6 py-3 text-base font-extrabold text-white transition hover:bg-[#ef5353] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Palette className="h-5 w-5" />
                {isLoading ? "Drawing..." : "Generate Image"}
              </button>
            </div>
          </form>
        </div>

        {error ? (
          <div className="mb-6 w-full max-w-[990px] rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-[#a3352b]">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex w-full max-w-[990px] items-center justify-center py-16 text-lg font-semibold text-[#8a8a8a]">
            Wonder is drawing &ldquo;{submittedWord}&rdquo;...
          </div>
        ) : null}

        {submittedWord && imageUrl && !isLoading ? (
          <div className="flex w-full max-w-[990px] animate-fade-in flex-col items-center">
            <h2 className="mb-6 text-4xl font-black capitalize text-[#a3352b]">
              {submittedWord}
            </h2>

            <div className="aspect-square w-full max-w-[500px] rounded-[24px] border border-[#ecdfc9] bg-white p-4 shadow-[0_12px_36px_rgba(0,0,0,0.05)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={submittedWord}
                className="h-full w-full rounded-2xl object-cover"
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <a
                href={imageUrl}
                download
                className="rounded-full border border-[#ecdfc9] bg-white px-5 py-2.5 text-sm font-bold text-[#5a5a5a] transition hover:bg-[#faf7f2]"
              >
                Download
              </a>
              <button
                type="button"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: submittedWord, url: imageUrl }).catch(() => {});
                  }
                }}
                className="rounded-full border border-[#ecdfc9] bg-white px-5 py-2.5 text-sm font-bold text-[#5a5a5a] transition hover:bg-[#faf7f2]"
              >
                Share
              </button>
              <button
                type="button"
                onClick={handleTryAnother}
                className="rounded-full bg-[#4ecdc4] px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#3dbdb3]"
              >
                Try Another Word
              </button>
            </div>
          </div>
        ) : null}
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
            <Link href="/privacy" className="hover:text-[#2b2b2b]">Privacy</Link>
            <Link href="/terms" className="hover:text-[#2b2b2b]">Terms</Link>
            <a href="#" className="hover:text-[#2b2b2b]">Support</a>
            <a href="#" className="hover:text-[#2b2b2b]">About Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
}