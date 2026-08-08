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

const DAILY_REFRESH_CARDS = [
  {
    title: "Word Beats",
    description: "Turn any word into a song!",
    accent: "bg-[#fde2e2]",
    textAccent: "text-[#c0392b]",
    href: null as string | null
  },
  {
    title: "Word Vision",
    description: "See your words come to life!",
    accent: "bg-[#dbeeff]",
    textAccent: "text-[#1d6fa5]",
    href: null as string | null
  },
  {
    title: "Word Explorer",
    description: "Find the secret meaning of words!",
    accent: "bg-[#fdf1d6]",
    textAccent: "text-[#a3352b]",
    href: "/explorer" as string | null
  },
  {
    title: "Read Aloud",
    description: "Practice reading with Wonder!",
    accent: "bg-[#ece1fb]",
    textAccent: "text-[#6b21a8]",
    href: null as string | null
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
  siblings
}: {
  childName: string;
  siblings: Sibling[];
}) {
  const router = useRouter();
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
      {/* ---------------------------------------------------------------- */}
      {/* Header                                                          */}
      {/* ---------------------------------------------------------------- */}
      <header className="border-b border-[#ecdfc9] bg-white">
        <div className="mx-auto flex max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] items-center justify-between px-6 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="WonderWord AI" className="h-8 w-auto" />

          <nav className="absolute left-1/2 hidden -translate-x-1/2 gap-8 text-sm font-medium text-[#4a4a4a] md:flex">
            <a href="#" className="border-b-2 border-[#a3352b] pb-1 font-bold text-[#2b2b2b]">
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

          <div className="flex items-center gap-3">
            {siblings.length > 0 ? (
              <ProfileSwitcherDropdown siblings={siblings} onSwitch={handleSwitchSibling} />
            ) : null}

            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 to-pink-300 text-xs font-black text-white">
                {childName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium">{childName}</span>
            </div>

            <button
              type="button"
              onClick={handleBackToParent}
              className="rounded-full border border-[#ecdfc9] px-3 py-1.5 text-xs font-bold text-[#5a5a5a] transition hover:bg-[#faf7f2]"
            >
              ← Parent
            </button>

            <form action={signOut}>
              <button
                type="submit"
                className="rounded-full border border-[#ecdfc9] px-3 py-1.5 text-xs font-bold text-[#5a5a5a] transition hover:bg-[#faf7f2]"
              >
                Log Out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] px-6 py-8">
        {/* Streak banner — Coming Soon */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#ff9d4d] to-[#ff6b35] p-6 text-white shadow-sm">
          <div className="absolute right-4 top-4">
            <ComingSoonBadge />
          </div>
          <div className="flex items-center gap-4">
            <Flame className="size-8" />
            <div>
              <h2 className="text-lg font-black">5-Day Streak — Keep it going!</h2>
              <p className="mt-1 text-sm font-semibold text-white/90">
                You&apos;re on fire! Read for 10 more minutes to hit your goal.
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
              <div className="absolute right-4 top-4">
                <ComingSoonBadge />
              </div>
              <h3 className="text-sm font-black text-[#2b2b2b]">Today&apos;s Goal</h3>
              <p className="text-xs text-[#5a5a5a]">3 of 5 pages read</p>
              <div className="mt-4 grid place-items-center">
                <div className="grid size-24 place-items-center rounded-full border-8 border-[#1f9c86]/30 text-2xl font-black text-[#1f9c86]">
                  68%
                </div>
              </div>
            </section>

            <section className="relative rounded-2xl bg-amber-50 p-6">
              <div className="absolute right-4 top-4">
                <ComingSoonBadge />
              </div>
              <h3 className="text-sm font-black text-[#2b2b2b]">Weekly Challenge</h3>
              <p className="mt-1 text-sm leading-6 text-[#5a5a5a]">
                Read 1 Space story without getting stuck — earn 50 XP!
              </p>
              <button
                type="button"
                disabled
                className="mt-4 w-full cursor-not-allowed rounded-full bg-amber-300/60 py-2 text-sm font-black text-white"
              >
                Try it! →
              </button>
            </section>
          </div>
        </div>

        <section className="relative mt-6 flex items-center justify-between gap-4 rounded-2xl bg-[#e6f5f1] p-6">
          <div className="absolute right-4 top-4">
            <ComingSoonBadge />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#1f9c86]">Word of the day</p>
            <p className="mt-1 text-3xl font-black text-[#2b2b2b]">Curious</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#5a5a5a]">
              Feeling curious means you want to learn more or know about something!
            </p>
          </div>
          <div className="grid size-12 shrink-0 place-items-center rounded-full bg-[#1f9c86] text-white">
            <Mic className="size-5" />
          </div>
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
                  <span className="mt-3 inline-block text-xs font-black text-[#2b2b2b]/60">⭐ Earn 20</span>
                </Link>
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

        <section className="mt-8">
          <h2 className="text-sm font-black uppercase tracking-[0.1em] text-[#8a8a8a]">
            Pick a story world
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {STORY_WORLDS.map((world) => (
              <div
                key={world.name}
                className="relative flex flex-col items-center gap-2 rounded-2xl p-4 text-center text-white opacity-80"
                style={{ backgroundColor: world.color }}
              >
                <div className="absolute right-2 top-2">
                  <ComingSoonBadge />
                </div>
                <span className="mt-4 text-3xl">{world.emoji}</span>
                <span className="text-sm font-black">{world.name}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-[#8a8a8a]">
            AI-generated themed stories are coming soon — for now, scan a worksheet above to start reading.
          </p>
        </section>
      </main>

      <footer className="border-t border-[#f0e6d8] bg-white py-8">
        <div className="mx-auto flex max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] flex-col items-center justify-between gap-4 px-6 text-sm text-[#8a8a8a] md:flex-row">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="WonderWord AI" className="h-6 w-auto opacity-80" />
            <p className="ml-1">© 2026 WonderWord AI.</p>
          </div>
          <div className="flex gap-5">
            <a href="#" className="hover:text-[#2b2b2b]">Privacy</a>
            <a href="/terms" className="hover:text-[#2b2b2b]">Terms</a>
            <a href="#" className="hover:text-[#2b2b2b]">Support</a>
            <a href="#" className="hover:text-[#2b2b2b]">About Us</a>
          </div>
        </div>
      </footer>
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
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-[#ecdfc9] px-3 py-1.5 text-xs font-bold text-[#5a5a5a] transition hover:bg-[#faf7f2]"
      >
        Switch Profile
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

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