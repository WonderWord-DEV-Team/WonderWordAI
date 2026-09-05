"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Volume2,
  VolumeX,
  BookOpen,
  LogOut
} from "lucide-react";
import { SiteHeader, type SiteNavItem } from "@/components/shared/SiteHeader";
import { SiteFooter } from "@/components/shared/SiteFooter";
import { recordActivityCompletion } from "@/app/child/activity-actions";
import { HeaderUserBadge } from "@/components/shared/HeaderUserBadge";
import { Button } from "@/components/shared/Button";

const HEADER_NAV_ITEMS: SiteNavItem[] = [
  { label: "Home", href: "/child" },
  { label: "Story Kids" },
  { label: "Word Explorer", href: "/explorer" },
  { label: "Store", href: "#", disabled: true },
];

// Define the steps for our story flow
type FlowStep = "loading" | "story";

type ThemeConfig = {
  name: string;
  emoji: string;
  color: string;
};

const THEME_CONFIGS: Record<string, ThemeConfig> = {
  space: { name: "Space", emoji: "🚀", color: "#2260e6" },
  dinos: { name: "Dinos", emoji: "🦕", color: "#10a84e" },
  "fairy tale": { name: "Fairy Tale", emoji: "🏰", color: "#d2237d" },
  heroes: { name: "Heroes", emoji: "🦸", color: "#e65100" },
  food: { name: "Food", emoji: "🍕", color: "#6b21a8" },
  animals: { name: "Animals", emoji: "🐾", color: "#e6a100" },
};

function ThemedStoryContent({ childName }: { childName: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const themeParam = searchParams.get("theme") || searchParams.get("world") || "Space";

  const [step, setStep] = useState<FlowStep>("loading");
  const [themeConfig, setThemeConfig] = useState<ThemeConfig | null>(null);
  const [storyTitle, setStoryTitle] = useState("");
  const [storyText, setStoryText] = useState("");

  // Story playback state
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Typing state
  const [userInput, setUserInput] = useState("");
  const hiddenInputRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [errorStory, setErrorStory] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-focus hidden textarea when entering the story step
  useEffect(() => {
    if (step === "story") {
      const timer = setTimeout(() => {
        hiddenInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Resolve active world from URL parameter & fetch real story from AI API
  useEffect(() => {
    const normTheme = themeParam.toLowerCase();
    const activeConfig = THEME_CONFIGS[normTheme] || THEME_CONFIGS["space"];
    setThemeConfig(activeConfig);

    setStep("loading");
    setUserInput(""); // reset typing input when changing themes
    setStoryTitle("");
    setStoryText("");

    const generateStory = async () => {
      try {
        setErrorStory(null);
        const res = await fetch("/api/themed-stories/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            theme: activeConfig.name,
            grade: 2, // Default grade
          }),
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            throw new Error("You must be logged in as a child to generate AI stories!");
          }
          throw new Error("Failed to generate story from AI. Please make sure the AI service is running and configured.");
        }

        const json = await res.json();
        if (json.data && json.data.title && json.data.text) {
          setStoryTitle(json.data.title);
          setStoryText(json.data.text);
        } else {
          throw new Error("Received empty story data from the server.");
        }
      } catch (err: any) {
        console.error("AI story generation failed:", err);
        setErrorStory(err.message || "An unexpected error occurred while generating the story.");
        setStoryTitle("Connection Error");
        setStoryText("");
      } finally {
        setStep("story");
      }
    };

    generateStory();
  }, [themeParam]);

  const renderTypingText = (textToRender: string) => {
    return textToRender.split("").map((char, index) => {
      let colorClass = "text-[#c2baa8] opacity-60"; // Lápis claro (decalque)
      const isCurrent = index === userInput.length;

      if (index < userInput.length) {
        if (userInput[index] === char) {
          colorClass = "text-[#12695a] font-extrabold"; // Escrita correta (Verde escuro canetinha)
        } else {
          colorClass = "text-[#ff6b6b] font-extrabold bg-[#ff6b6b]/10 rounded decoration-wavy underline"; // Erro (Vermelho)
        }
      }

      if (char === "\n") {
        return (
          <React.Fragment key={index}>
            {isCurrent && (
              <span className="inline-block w-2.5 h-1.5 bg-orange-500 rounded-full animate-pulse align-bottom" />
            )}
            <br />
          </React.Fragment>
        );
      }

      return (
        <span
          key={index}
          className={`${colorClass} ${
            isCurrent ? "border-b-4 border-orange-500 bg-orange-100/30 rounded-t font-black animate-pulse" : ""
          } transition-colors duration-100`}
        >
          {char}
        </span>
      );
    });
  };

  const handleHearStory = async () => {
    if (!storyText) return;

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
            text: storyText,
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
        // Fallback to browser SpeechSynthesis
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(storyText);
          utterance.rate = 0.85; // slower rate for kids
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

  const handleFinishStory = async () => {
    stopSpeaking();
    // Typing the story out in full is what "finishing" means here, so this is
    // the point where the day's goal and the weekly challenge learn about it.
    if (themeConfig) {
      await recordActivityCompletion({
        activityType: "themed_story",
        theme: themeConfig.name.toLowerCase()
      });
    }
    router.push("/child");
  };

  // ------------------------------------------------------------------
  // STEP 1: LOADING LOADER
  // ------------------------------------------------------------------
  if (step === "loading") {
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

  // If themeConfig is not resolved yet, show the loader as fallback
  if (!themeConfig) {
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
    <div className="min-h-screen bg-[#FDFAF5] text-[#2b2b2b] flex flex-col justify-between font-body relative overflow-hidden">
      {/* Floating background decorations */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/Top Left Star.jpg" alt="Star" className="absolute left-[3%] top-[15%] w-[45px] h-auto opacity-45 select-none hidden lg:block z-0 pointer-events-none" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/Top Left Star.jpg" alt="Star" className="absolute right-[3%] top-[20%] w-[35px] h-auto opacity-40 select-none hidden lg:block z-0 pointer-events-none" />
      <div className="absolute left-[5%] bottom-[25%] text-4xl opacity-25 select-none hidden lg:block z-0 pointer-events-none">✏️</div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/Top Left Star.jpg" alt="Star" className="absolute right-[5%] bottom-[15%] w-[55px] h-auto opacity-45 select-none hidden lg:block z-0 pointer-events-none" />
      <div className="absolute right-[8%] top-[45%] text-3xl opacity-25 select-none hidden lg:block z-0 pointer-events-none">✏️</div>

      {/* Header */}
      <div className="z-10">
        <SiteHeader navItems={HEADER_NAV_ITEMS} logoHref="/child" right={<HeaderUserBadge name={childName} />} />
      </div>

      {/* Main Content Workspace */}
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-6 py-10 flex flex-col justify-center z-10 relative">

        {/* STEP 2: STORY READING SHEET */}
        {step === "story" && (
          <div className="w-full flex flex-col items-stretch gap-6 animate-fadeIn">
            {/* Top Navigation Row */}
            <div className="w-full flex items-center justify-between border-b border-[#ecdfc9]/60 pb-4 mb-2">
              <Link
                href="/child"
                onClick={stopSpeaking}
                className="flex items-center gap-2 text-sm font-bold text-[#a3352b] hover:text-[#8c2c23] transition-colors"
              >
                <LogOut className="h-4 w-4 transform rotate-180" />
                Back to Worlds
              </Link>
              <div className="flex items-center gap-2 bg-[#fffbeb] border border-[#fde68a] text-amber-800 text-xs font-black uppercase px-3 py-1 rounded-full">
                <span>{themeConfig.emoji}</span>
                <span>{themeConfig.name} World</span>
              </div>
            </div>

            {/* Story worksheet card (Notebook Lined Pattern Background) */}
            <div
              onClick={() => hiddenInputRef.current?.focus()}
              className="worksheet-lines bg-white border border-[#ecdfc9] rounded-3xl p-6 sm:p-10 shadow-soft flex flex-col justify-between cursor-text relative"
            >
              <div className="flex-1">
                {/* Header badge & smaller controls toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  {/* Left: Badge */}
                  <div className="flex items-center gap-2 bg-white/90 border border-[#ecdfc9]/40 p-2 px-4 rounded-xl backdrop-blur-xs inline-flex shadow-xs">
                    <BookOpen className="h-5 w-5 text-[#a3352b]" />
                    <span className="text-xs font-black tracking-widest text-[#a3352b]/85 uppercase">
                      TYPE THE STORY IN {themeConfig.name.toUpperCase()} WORLD
                    </span>
                  </div>

                  {/* Right: Smaller, toolbar-style buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleHearStory}
                      className={`h-9 px-4 rounded-full font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm ${
                        isSpeaking
                          ? "bg-[#2b2b2b] text-white hover:bg-black"
                          : "bg-[#4ecdc4] text-white hover:bg-[#3dbdb3]"
                      }`}
                    >
                      {isSpeaking ? (
                        <>
                          <VolumeX className="h-3.5 w-3.5" />
                          Stop Voice
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-3.5 w-3.5" />
                          Hear Story
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Hidden Textarea */}
                <textarea
                  ref={hiddenInputRef}
                  value={userInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.length <= storyText.length) {
                      setUserInput(val);
                      if (val === storyText) {
                        setTimeout(() => {
                          void handleFinishStory();
                        }, 1000);
                      }
                    }
                  }}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  className="absolute opacity-0 pointer-events-none w-0 h-0"
                />

                {/* Character Renderer or Error Message */}
                {errorStory ? (
                  <div className="text-center py-12 px-6 bg-white border border-[#ecdfc9]/80 rounded-2xl shadow-xs">
                    <span className="text-4xl block mb-3">😢</span>
                    <h3 className="text-lg font-black text-[#a3352b] mb-1">Could Not Generate Story</h3>
                    <p className="text-sm text-[#8a8a8a] max-w-md mx-auto mb-4 font-semibold">
                      {errorStory}
                    </p>
                    <Button
                      type="button"
                      onClick={() => window.location.reload()}
                      variant="mint"
                      size="sm"
                      className="text-xs font-bold"
                    >
                      Try Again
                    </Button>
                  </div>
                ) : (
                  /* Character Renderer: Standard Clean Text Rectangle with active focus border */
                  <div className={`text-2xl sm:text-3xl font-extrabold text-[#3a3a3a] leading-[1.8] tracking-tight whitespace-pre-wrap font-body py-6 px-6 sm:px-8 select-none bg-white border rounded-2xl shadow-xs transition-colors duration-200 ${
                    isFocused ? "border-[#a3352b]" : "border-[#ecdfc9]/80"
                  }`}>
                    {storyText ? renderTypingText(storyText) : (
                      <span className="text-[#c2baa8] opacity-60">Writing your magical story... ✍️</span>
                    )}
                  </div>
                )}

                {/* Typing Instruction */}
                <div className="mt-6 text-xs font-bold text-[#8a8a8a] flex items-center gap-1.5 bg-white/90 border border-[#ecdfc9]/30 p-2 px-4 rounded-xl backdrop-blur-xs inline-flex shadow-xs">
                  <span>✍️</span>
                  <span>Click here and start typing to write the story! Press Backspace to fix mistakes.</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <div className="z-10">
        <SiteFooter />
      </div>
    </div>
  );
}

export function StoryClient({ childName }: { childName: string }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-[#FDFAF5]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/loader.svg"
          alt="Loading..."
          className="h-32 w-32 animate-spin"
        />
      </div>
    }>
      <ThemedStoryContent childName={childName} />
    </Suspense>
  );
}
