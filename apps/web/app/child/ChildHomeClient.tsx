"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ChevronDown, Flame, Mic } from "lucide-react";
import { WorksheetCapture } from "@/components/worksheet/WorksheetCapture";
import { useChildSession } from "@/components/child/ChildSessionContext";
import { useCreateSession, useOpenSessions } from "@/hooks/useSessions";
import { switchToParent, switchToSibling } from "@/app/profiles/actions";
import { signOut } from "@/app/auth/actions";
import { SiteHeader, type SiteNavItem } from "@/components/shared/SiteHeader";
import { SiteFooter } from "@/components/shared/SiteFooter";
import { HeaderUserBadge } from "@/components/shared/HeaderUserBadge";
import { Button } from "@/components/shared/Button";
import type { ChildHomeDaily } from "@/lib/child/dailyContent";

const HEADER_NAV_ITEMS: SiteNavItem[] = [
  { label: "Home", href: "#", active: true },
  { label: "Story Library", href: "#" },
  { label: "Store", href: "#" },
  { label: "Diagnostics", href: "#" },
];

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type StoryWorld = {
  name: string;
  color: string;
  emoji: string;
};

const STORY_WORLDS: StoryWorld[] = [
  { name: "Space", color: "#2260e6", emoji: "🚀" },
  { name: "Dinos", color: "#10a84e", emoji: "🦕" },
  { name: "Fairy Tale", color: "#d2237d", emoji: "🏰" },
  { name: "Heroes", color: "#e65100", emoji: "🦸" },
  { name: "Food", color: "#6b21a8", emoji: "🍕" },
  { name: "Animals", color: "#e6a100", emoji: "🐾" }
];

type DailyRefreshCard = {
  title: string;
  description: string;
  accent: string;
  textAccent: string;
  href: string | null;
  action?: "read-aloud";
};

const DAILY_REFRESH_CARDS: DailyRefreshCard[] = [
  {
    title: "Word Beats",
    description: "Turn any word into a song!",
    accent: "bg-[#fde2e2]",
    textAccent: "text-[#c0392b]",
    href: null
  },
  {
    title: "Word Vision",
    description: "See your words come to life!",
    accent: "bg-[#dbeeff]",
    textAccent: "text-[#1d6fa5]",
    href: "/vision" as string | null 
  },
  {
    title: "Word Explorer",
    description: "Find the secret meaning of words!",
    accent: "bg-[#fdf1d6]",
    textAccent: "text-[#a3352b]",
    href: "/explorer"
  },
  {
    title: "Read Aloud",
    description: "Practice reading with Wonder!",
    accent: "bg-[#ece1fb]",
    textAccent: "text-[#6b21a8]",
    href: "/read-aloud"
  }
];

function ComingSoonBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-white">
      Coming soon
    </span>
  );
}

type Sibling = { child_id: string; name: string };

export function ChildHomeClient({
  childName,
  siblings,
  daily
}: {
  childName: string;
  siblings: Sibling[];
  daily: ChildHomeDaily;
}) {
  const router = useRouter();
  const { streakDays, goal, challenge, word } = daily;
  const [isSpeakingWord, setIsSpeakingWord] = useState(false);
  const {
    sessionId,
    setSessionId,
    childId,
    setChildId,
    worksheetStatus,
    setWorksheetStatus,
    setOcrResult
  } = useChildSession();
  const { data: openSessions } = useOpenSessions();
  const { mutateAsync: createSession } = useCreateSession();
  const sessionRequestRef = useRef<Promise<string> | null>(null);
  const storyWorldsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (childId) return;
    if (!uuidPattern.test(sessionId)) return;

    const match = openSessions?.find((session) => session.id === sessionId);
    if (match) {
      setChildId(match.childId);
    }
  }, [childId, sessionId, openSessions, setChildId]);

  const ensureSession = useCallback(async () => {
    if (uuidPattern.test(sessionId)) {
      return sessionId;
    }

    if (sessionRequestRef.current) {
      return sessionRequestRef.current;
    }

    sessionRequestRef.current = createSession()
      .then((session) => {
        setSessionId(session.id);
        setChildId(session.childId);
        return session.id;
      })
      .finally(() => {
        sessionRequestRef.current = null;
      });

    return sessionRequestRef.current;
  }, [createSession, sessionId, setSessionId, setChildId]);

  const handleOcrComplete = (result: { sessionId: string; text: string; imageKeywords: string[] }) => {
    setOcrResult(result);
    router.push(`/child/${result.sessionId}/read`);
  };

  const handleStartReadAloud = async () => {
    const id = await ensureSession();
    router.push(`/child/${id}/read`);
  };

  const handleStartStoryWorld = async (theme: string) => {
    const id = await ensureSession();
    router.push(`/child/${id}/story?theme=${theme.toLowerCase()}`);
  };

  const handleStartChallenge = async () => {
    if (challenge.storyTheme) {
      await handleStartStoryWorld(challenge.storyTheme);
      return;
    }

    // "Any world" challenges stay on this page — send the child to the picker.
    if (challenge.ctaHref === "/child") {
      storyWorldsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    router.push(challenge.ctaHref);
  };

  // Word of the Day is read out by the browser itself — no narration API call.
  const handleSpeakWord = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    if (isSpeakingWord) {
      setIsSpeakingWord(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(`${word.word}. ${word.definition}`);
    utterance.rate = 0.85; // slower pace for young readers
    utterance.lang = "en-US";
    utterance.onend = () => setIsSpeakingWord(false);
    utterance.onerror = () => setIsSpeakingWord(false);

    setIsSpeakingWord(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleBackToParent = async () => {
    const result = await switchToParent();
    if (result.success) {
      router.push("/parent/dashboard");
    } else {
      router.push("/auth/login");
    }
  };

  const handleSwitchSibling = async (targetChildId: string) => {
    const result = await switchToSibling(targetChildId);
    if (result.success) {
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFAF5] text-[#2b2b2b]">
      <SiteHeader
        navItems={HEADER_NAV_ITEMS}
        right={
          <div className="flex items-center gap-3">
            {siblings.length > 0 ? (
              <ProfileSwitcherDropdown siblings={siblings} onSwitch={handleSwitchSibling} />
            ) : null}

            <HeaderUserBadge name={childName} />

            <Button type="button" onClick={handleBackToParent} variant="outline" size="sm">
              ← Parent
            </Button>

            <form action={signOut}>
              <Button type="submit" variant="outline" size="sm">
                Log Out
              </Button>
            </form>
          </div>
        }
      />

      <main className="mx-auto max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] px-6 py-8">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#ff9d4d] to-[#ff6b35] p-6 text-white shadow-sm">
          <div className="flex items-center gap-4">
            <Flame className="size-8" />
            <div>
              <h2 className="text-lg font-black">
                {streakDays === 1
                  ? "Day 1 — your streak starts today!"
                  : `${streakDays}-Day Streak — Keep it going!`}
              </h2>
              <p className="mt-1 text-sm font-semibold text-white/90">
                {goal.completedCount >= goal.targetCount
                  ? "You hit today's goal! Come back tomorrow to grow your streak."
                  : `You're on fire! ${goal.targetCount - goal.completedCount} more ${
                      goal.targetCount - goal.completedCount === 1 ? "activity" : "activities"
                    } to hit today's goal.`}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="rounded-2xl border border-[#f0e6d8] bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="grid size-14 place-items-center rounded-full bg-[#a3352b]/10 text-[#a3352b]">
                <Camera className="size-7" />
              </div>
              <h2 className="text-xl font-black text-[#2b2b2b]">Snap homework</h2>
              <p className="max-w-sm text-sm leading-6 text-[#5a5a5a]">
                Turn any worksheet into an interactive story and learn as you play!
              </p>
            </div>

            <div className="mt-5">
              <WorksheetCapture
                status={worksheetStatus}
                onStatusChange={setWorksheetStatus}
                ensureSession={ensureSession}
                onOcrComplete={handleOcrComplete}
              />
            </div>
          </section>

          <div className="grid gap-6">
            <section className="relative rounded-2xl bg-[#e6f5f1] p-6">
              <h3 className="text-sm font-black text-[#2b2b2b]">Today&apos;s Goal</h3>
              <p className="text-xs text-[#5a5a5a]">
                {goal.completedCount} of {goal.targetCount} {goal.unit} done
              </p>
              <div className="mt-4 grid place-items-center">
                <div
                  role="progressbar"
                  aria-label={`Today's goal: ${goal.title}`}
                  aria-valuenow={goal.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="grid size-24 place-items-center rounded-full"
                  style={{
                    background: `conic-gradient(#1f9c86 ${goal.percent * 3.6}deg, rgba(31, 156, 134, 0.2) 0deg)`
                  }}
                >
                  <div className="grid size-[72px] place-items-center rounded-full bg-[#e6f5f1] text-2xl font-black text-[#1f9c86]">
                    {goal.percent}%
                  </div>
                </div>
              </div>
              <p className="mt-4 text-center text-xs font-black text-[#2b2b2b]">
                {goal.emoji} {goal.title}
              </p>
              <p className="mt-1 text-center text-xs leading-5 text-[#5a5a5a]">
                {goal.description}
              </p>
            </section>

            <section className="relative rounded-2xl bg-amber-50 p-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-black text-[#2b2b2b]">Weekly Challenge</h3>
                <span className="rounded-full bg-amber-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-amber-900">
                  {challenge.xpReward} XP
                </span>
              </div>
              <p className="mt-1 text-sm font-black text-[#2b2b2b]">{challenge.title}</p>
              <p className="mt-1 text-sm leading-6 text-[#5a5a5a]">{challenge.description}</p>
              <Button
                type="button"
                onClick={handleStartChallenge}
                variant="sunset"
                size="sm"
                fullWidth
                className="mt-4"
              >
                {challenge.ctaLabel} →
              </Button>
            </section>
          </div>
        </div>

        <section className="relative mt-6 flex items-center justify-between gap-4 rounded-2xl bg-[#e6f5f1] p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#1f9c86]">Word of the day</p>
            <p className="mt-1 text-3xl font-black text-[#2b2b2b]">
              {word.word}
              {word.partOfSpeech ? (
                <span className="ml-2 align-middle text-sm font-semibold italic text-[#5a5a5a]">
                  {word.partOfSpeech}
                </span>
              ) : null}
            </p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#5a5a5a]">{word.definition}</p>
            <p className="mt-1 max-w-xl text-sm italic leading-6 text-[#5a5a5a]">
              &ldquo;{word.exampleSentence}&rdquo;
            </p>
          </div>
          <button
            type="button"
            onClick={handleSpeakWord}
            aria-label={isSpeakingWord ? `Stop reading ${word.word}` : `Hear ${word.word}`}
            className={`grid size-12 shrink-0 place-items-center rounded-full text-white transition hover:scale-105 active:scale-95 ${
              isSpeakingWord ? "bg-[#a3352b]" : "bg-[#1f9c86]"
            }`}
          >
            <Mic className="size-5" />
          </button>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-black uppercase tracking-[0.1em] text-[#8a8a8a]">Daily Refresh</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DAILY_REFRESH_CARDS.map((card) =>
              card.href ? (
                <Link
                  key={card.title}
                  href={card.href}
                  className={`rounded-2xl ${card.accent} p-5 shadow-sm transition hover:scale-[1.02]`}
                >
                  <h3 className={`font-black ${card.textAccent}`}>{card.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#2b2b2b]/80">{card.description}</p>
                  {/* <span className="mt-3 inline-block text-xs font-black text-[#2b2b2b]/60">⭐ Earn 20</span> */}
                </Link>
              ) : card.action === "read-aloud" ? (
                <button
                  key={card.title}
                  type="button"
                  onClick={handleStartReadAloud}
                  className={`rounded-2xl ${card.accent} p-5 text-left shadow-sm transition hover:scale-[1.02]`}
                >
                  <h3 className={`font-black ${card.textAccent}`}>{card.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#2b2b2b]/80">{card.description}</p>
                  <span className="mt-3 inline-block text-xs font-black text-[#2b2b2b]/60">⭐ Earn 20</span>
                </button>
              ) : (
                <div key={card.title} className={`relative rounded-2xl ${card.accent} p-5 opacity-70`}>
                  <div className="absolute right-3 top-3">
                    <ComingSoonBadge />
                  </div>
                  <h3 className={`font-black ${card.textAccent}`}>{card.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#2b2b2b]/80">{card.description}</p>
                </div>
              )
            )}
          </div>
        </section>

        <section ref={storyWorldsRef} className="mt-8 scroll-mt-24">
          <h2 className="text-sm font-black uppercase tracking-[0.1em] text-[#8a8a8a]">
            Pick a story world
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {STORY_WORLDS.map((world) => (
              <button
                key={world.name}
                type="button"
                onClick={() => handleStartStoryWorld(world.name)}
                className="relative flex flex-col items-center gap-2 rounded-2xl p-4 text-center text-white transition hover:scale-[1.05] hover:shadow-md cursor-pointer active:scale-95"
                style={{ backgroundColor: world.color }}
              >
                <span className="mt-4 text-3xl">{world.emoji}</span>
                <span className="text-sm font-black">{world.name}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-[#8a8a8a]">
            Choose a theme to generate an interactive AI story!
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function ProfileSwitcherDropdown({
  siblings,
  onSwitch
}: {
  siblings: Sibling[];
  onSwitch: (childId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Button type="button" onClick={() => setIsOpen((v) => !v)} variant="outline" size="sm">
        Switch Profile
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </Button>

      {isOpen ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-48 overflow-hidden rounded-2xl border border-[#ecdfc9] bg-white shadow-lg">
          {siblings.map((sibling) => (
            <button
              key={sibling.child_id}
              type="button"
              onClick={() => {
                setIsOpen(false);
                onSwitch(sibling.child_id);
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-[#2b2b2b] transition hover:bg-[#faf7f2]"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-teal-300 to-sky-300 text-xs font-black text-white">
                {sibling.name.charAt(0).toUpperCase()}
              </span>
              {sibling.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
