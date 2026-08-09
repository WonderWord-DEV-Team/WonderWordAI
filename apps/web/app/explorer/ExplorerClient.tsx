"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { LogOut, Volume2, VolumeX, X } from "lucide-react";

type DefinitionData = {
  definition: string;
  emoji: string;
  imageUrl: string | null;
};

const fallbackDefinition = (): Omit<DefinitionData, "imageUrl"> => ({
  definition: `is a wonderful word that we can read and explore! Let's practice saying it together to learn its special sound.`,
  emoji: "✨"
});

export function ExplorerClient({ childName }: { childName: string }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [submittedWord, setSubmittedWord] = useState<string | null>(null);
  const [definition, setDefinition] = useState<DefinitionData | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Estados de controle de áudio
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const handleHearDefinition = async () => {
    if (!definition || !submittedWord) return;

    // Concatena a palavra com o significado para a narração
    const textToSpeak = `${submittedWord}. ${definition.definition}`;

    if (isSpeaking) {
      stopSpeaking();
    } else {
      setIsSpeaking(true);
      try {
        const res = await fetch("/api/narration", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: textToSpeak,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to generate OpenAI TTS");
        }

        const json = await res.json();
        if (json.data && json.data.audio_base64) {
          const audioUrl = `data:audio/mp3;base64,${json.data.audio_base64}`;
          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          audio.onended = () => {
            setIsSpeaking(false);
          };
          audio.onerror = () => {
            setIsSpeaking(false);
          };
          await audio.play();
        } else {
          throw new Error("No audio returned from narration API");
        }
      } catch (err) {
        console.error("OpenAI TTS failed, falling back to browser SpeechSynthesis:", err);
        // Fallback para SpeechSynthesis do navegador
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(textToSpeak);
          utterance.rate = 0.85; // velocidade mais lenta para crianças
          utterance.lang = "en-US";
          utterance.onend = () => setIsSpeaking(false);
          utterance.onerror = () => setIsSpeaking(false);
          window.speechSynthesis.speak(utterance);
        } else {
          setIsSpeaking(false);
          alert("Could not play story voice.");
        }
      }
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchTerm.trim();
    if (!query || isLoading) return;

    setIsLoading(true);
    setSubmittedWord(query);
    setHasSearched(true);
    setDefinition(null);
    stopSpeaking(); // Interrompe o áudio anterior caso uma nova pesquisa seja feita

    const definitionPromise = fetch("/api/word-explorer/define", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word: query })
    })
      .then((res) => {
        if (!res.ok) throw new Error("definition lookup failed");
        return res.json();
      })
      .then((body) => ({
        definition: body.data.definition as string,
        emoji: body.data.emoji as string
      }))
      .catch((error) => {
        console.error("Word Explorer definition lookup failed, using fallback.", error);
        return fallbackDefinition();
      });

    const imagePromise = fetch("/api/illustrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word: query, mode: "auto" })
    })
      .then((res) => {
        if (!res.ok) throw new Error("image lookup failed");
        return res.json();
      })
      .then((body) => (body.url ? (body.url as string) : null))
      .catch((error) => {
        console.error("Word Explorer illustration lookup failed, showing no image.", error);
        return null;
      });

    const [defResult, imageUrl] = await Promise.all([definitionPromise, imagePromise]);

    setDefinition({
      definition: defResult.definition,
      emoji: defResult.emoji,
      imageUrl
    });
    setIsLoading(false);
  };

  const handleClear = () => {
    stopSpeaking(); // Interrompe o áudio ao limpar a tela
    setSearchTerm("");
    setSubmittedWord(null);
    setDefinition(null);
    setHasSearched(false);
  };

  return (
    <div className="min-h-screen bg-[#FDFAF5] text-[#2b2b2b] flex flex-col justify-between font-body">
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

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 to-pink-300 text-xs font-black text-white">
              {childName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium">{childName}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1280px] mx-auto px-6 md:px-[200px] py-12 flex flex-col justify-center items-start">
        <div className="w-full flex justify-start mb-6">
          <Link
            href="/child"
            onClick={stopSpeaking} // Interrompe o áudio ao voltar para a home
            className="flex items-center gap-2 text-sm font-bold text-[#a3352b] hover:text-[#8c2c23] transition-colors"
          >
            <LogOut className="h-4 w-4 transform rotate-180" />
            End Session
          </Link>
        </div>

        <div className="w-full flex flex-col justify-start items-start gap-8 md:gap-[60px] opacity-100 mb-12">
          <div className="text-start">
            <h1 className="text-4xl font-serif md:text-5xl font-bold text-[#a3352b]">
              Word Explorer
            </h1>
            <p className="mt-2 text-lg text-[#5a5a5a]">
              Type any word to discover its secret meaning!
            </p>
          </div>

          <form onSubmit={handleSearch} className="w-full max-w-[800px] self-center relative">
            <div className="relative flex items-center bg-white border border-[#ecdfc9] rounded-full px-6 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_24px_rgba(163,53,43,0.04)] focus-within:border-[#a3352b]/50 transition duration-200">
              <input
                type="text"
                placeholder="Type a word..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isLoading}
                className="w-full bg-transparent outline-none text-xl text-[#2b2b2b] placeholder-slate-400 font-medium pr-10"
              />
              {searchTerm && !isLoading && (
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

        {hasSearched && submittedWord && isLoading && (
          <div className="w-full max-w-[990px] flex items-center justify-center py-16 text-lg font-semibold text-[#8a8a8a]">
            Looking up &ldquo;{submittedWord}&rdquo;...
          </div>
        )}

        {hasSearched && submittedWord && definition && !isLoading && (
          <div className="w-full max-w-[990px] flex flex-col items-start animate-fade-in">
            <div className="w-full h-auto bg-white border border-[#ecdfc9] rounded-[10px] overflow-hidden shadow-[0_12px_36px_rgba(0,0,0,0.05)] flex flex-col">
              <div className="bg-[#bcdfc1] py-5 text-center border-b border-[#ecdfc9]">
                <h2 className="text-3xl font-extrabold text-[#12695a] capitalize">
                  {submittedWord}
                </h2>
              </div>

              <div className="p-8 flex flex-col sm:flex-row gap-8 items-stretch">
                <div className="w-full sm:w-[220px] min-h-[220px] sm:min-h-0 rounded-[10px] overflow-hidden bg-[#f0e6d8] flex items-center justify-center">
                  {definition.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={definition.imageUrl}
                      alt={submittedWord}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-6xl">{definition.emoji}</span>
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-between gap-6">
                  <div className="border border-[#ecdfc9] bg-white rounded-[10px] p-6 flex-1 flex items-center">
                    <p className="text-2xl leading-relaxed text-[#2b2b2b]">
                      <span className="font-extrabold capitalize">{submittedWord} </span>
                      {definition.definition} <span className="inline-block ml-1">{definition.emoji}</span>
                    </p>
                  </div>

                  <div className="flex flex-col min-[480px]:flex-row gap-4">
                    <button
                      type="button"
                      onClick={handleHearDefinition}
                      className={`flex-1 min-h-[56px] text-white text-xl font-extrabold px-6 py-3 rounded-full flex items-center justify-center gap-2 transition shadow-sm ${
                        isSpeaking
                          ? "bg-[#2b2b2b] hover:bg-black"
                          : "bg-[#4ecdc4] hover:bg-[#3dbdb3]"
                      }`}
                    >
                      {isSpeaking ? (
                        <>
                          <VolumeX className="h-6 w-6" />
                          Stop Voice
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-6 w-6" />
                          Hear it again
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleClear}
                      className="flex-1 min-h-[56px] bg-[#ff6b6b] hover:bg-[#e85a5a] text-white text-xl font-extrabold px-6 py-3 rounded-full flex items-center justify-center gap-2 transition shadow-sm"
                    >
                      Finish
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full mt-6 flex items-center justify-center gap-2 text-3xl font-black text-[#2b2b2b] tracking-tight">
              +20 Stars
              <svg className="h-8 w-8 fill-[#fbbf24]" viewBox="0 0 24 24">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            </div>
          </div>
        )}
      </main>

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