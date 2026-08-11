"use client";

import { useRouter } from "next/navigation";
import { BookOpen, CheckCircle2, LogOut, Target } from "lucide-react";
import { useChildSession } from "@/components/child/ChildSessionContext";
import type { AuthContext } from "@/lib/auth/types";

type ReadingResultsShellProps = {
  auth: AuthContext;
};

// Strips punctuation before comparing words. Without this, a word at the
// end of a sentence (e.g. "ahead.") never matches its miscue entry
// ("ahead"), so it silently counted as correct even when it was one of the
// words the child misread.
function normalizeWord(word: string) {
  return word.toLowerCase().replace(/[^a-z0-9']/g, "");
}

const STAT_COLORS = {
  orange: "bg-[#F5A623]",
  teal: "bg-[#0F9C8E]",
  coral: "bg-[#E8604F]"
} as const;

function StatPill({
  color,
  icon,
  label,
  value
}: {
  color: keyof typeof STAT_COLORS;
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div
      className={`flex w-28 flex-col items-center gap-2 rounded-full ${STAT_COLORS[color]} px-4 py-6 text-white shadow-sm`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/25">
        {icon}
      </span>
      <span className="text-center text-[10px] font-bold uppercase leading-tight tracking-wide">
        {label}
      </span>
      <span className="text-2xl font-black">{value}</span>
    </div>
  );
}

function DecorativeStars() {
  const positions = [
    { top: "6%", left: "4%", size: "text-2xl", opacity: "opacity-70" },
    { top: "12%", left: "92%", size: "text-xl", opacity: "opacity-60" },
    { top: "88%", left: "8%", size: "text-lg", opacity: "opacity-50" },
    { top: "82%", left: "90%", size: "text-2xl", opacity: "opacity-60" }
  ];

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {positions.map((pos, index) => (
        <span
          key={index}
          className={`absolute select-none ${pos.size} ${pos.opacity}`}
          style={{ top: pos.top, left: pos.left }}
        >
          ⭐
        </span>
      ))}
    </div>
  );
}

export function ReadingResultsShell({ auth }: ReadingResultsShellProps) {
  const router = useRouter();
  const { latestTranscription, worksheetText } = useChildSession();

  const words = latestTranscription?.words ?? [];
  const miscues = latestTranscription?.miscues ?? [];
  const miscueWordSet = new Set(miscues.map((m) => normalizeWord(m.word)));

  // "Correct" and "To practice" are derived from the SAME pass over `words`
  // now, instead of "Correct" coming from `words` and "To practice" coming
  // from `miscues.length` independently. Those two counts previously had
  // no guarantee of summing to `words.length` -- if `miscues` contained an
  // entry that didn't actually correspond to a word in this reading (e.g.
  // stale state from an earlier session), it would inflate "To practice"
  // without changing "Correct" at all, so the numbers wouldn't add up.
  // Deriving both from `words` guarantees correct + toPractice === words
  // read, always.
  const incorrectWords = words.filter((w) => miscueWordSet.has(normalizeWord(w.word)));
  const correctCount = words.length - incorrectWords.length;

  // Words to practice, deduplicated by normalized form -- if the child
  // misread the same word twice, it should show once as a practice chip,
  // not once per occurrence.
  const uniquePracticeWords = Array.from(
    new Map(incorrectWords.map((w) => [normalizeWord(w.word), w.word])).values()
  );

  const accuracy = words.length > 0 ? Math.round((correctCount / words.length) * 100) : null;
  const hasResults = Boolean(latestTranscription);

  return (
    <div className="min-h-screen bg-[#FDFAF5] text-[#2b2b2b] flex flex-col justify-between font-body">
      <header className="border-b border-[#ecdfc9] bg-white">
        <div className="mx-auto flex max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] items-center justify-between px-6 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="WonderWord AI" className="h-8 w-auto" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-300 to-pink-300" />
            <span className="text-sm font-medium">{auth.email}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-16 flex-1">
        <a
          href="/child"
          className="flex items-center gap-2 text-[#a3352b] hover:text-[#c03d32] text-lg font-bold font-body mb-6 transition"
        >
          <LogOut className="h-5 w-5 transform rotate-180" /> End Session
        </a>

        {!hasResults ? (
          <>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-8">
              Your reading results
            </h1>
            <div className="rounded-[24px] border border-[#ecdfc9]/60 bg-white p-10 text-center shadow-sm">
              <p className="text-lg font-extrabold leading-8">
                No results yet. Finish a reading session to see how it went.
              </p>
              <a
                href="/child"
                className="mt-4 inline-block rounded-full bg-[#ff6868] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#ef5353]"
              >
                Go to Home
              </a>
            </div>
          </>
        ) : (
          <>
            <div className="relative mb-8 overflow-hidden rounded-[32px] border border-[#ecdfc9]/60 bg-white px-6 py-10 text-center shadow-sm sm:px-10">
              <DecorativeStars />

              <div className="relative flex items-center justify-center gap-3">
                <span className="text-3xl sm:text-4xl">🎉</span>
                <h1 className="text-3xl font-extrabold tracking-tight text-[#2b2b2b] sm:text-5xl">
                  You Did It!
                </h1>
              </div>

              <div className="relative mt-16 flex justify-center sm:mt-20">
                <div className="relative">
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-2xl border border-[#ecdfc9] bg-white px-4 py-2 text-sm font-bold text-[#2b2b2b] shadow-sm">
                    {uniquePracticeWords.length === 0 ? "Perfect reading! 🌟" : "Great effort! 🌟"}
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/mascot.svg"
                    alt="WonderWord mascot"
                    className="h-24 w-24 sm:h-28 sm:w-28"
                  />
                </div>
              </div>

              <div className="relative mt-8 flex flex-wrap items-center justify-center gap-4">
                <StatPill color="orange" icon={<BookOpen className="h-5 w-5" />} label="Words Read" value={words.length} />
                <StatPill color="teal" icon={<CheckCircle2 className="h-5 w-5" />} label="Correct" value={correctCount} />
                {accuracy !== null ? (
                  <StatPill color="coral" icon={<Target className="h-5 w-5" />} label="Accuracy" value={`${accuracy}%`} />
                ) : null}
              </div>

              {uniquePracticeWords.length > 0 ? (
                <p className="relative mt-6 text-sm font-bold text-[#a3352b]">
                  {uniquePracticeWords.length} {uniquePracticeWords.length === 1 ? "word" : "words"} to practice
                </p>
              ) : null}

              <div className="relative mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => router.push("/child")}
                  className="rounded-full bg-[#ff6868] px-8 py-3 text-base font-black text-white shadow-sm transition hover:bg-[#ef5353]"
                >
                  Read another worksheet
                </button>
              </div>
            </div>

            {uniquePracticeWords.length > 0 ? (
              <div className="mb-8 rounded-[24px] border border-[#ecdfc9]/60 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-black">Words to practice</h2>
                <ul className="flex flex-wrap gap-2">
                  {uniquePracticeWords.map((word, index) => (
                    <li
                      key={`${word}-${index}`}
                      className="rounded-full border border-[#a3352b]/30 bg-[#fbeceb] px-4 py-2 text-sm font-black text-[#a3352b]"
                    >
                      {word}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="rounded-[24px] border border-[#ecdfc9]/60 bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-lg font-black">What you read</h2>
              <p className="text-base leading-7 text-[#4a4a4a]">
                {latestTranscription?.transcript || worksheetText || "—"}
              </p>
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-[#f0e6d8] bg-white py-8">
        <div className="mx-auto flex max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] flex-col items-center justify-between gap-4 px-6 text-sm text-[#8a8a8a] md:flex-row">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="WonderWord AI" className="h-6 w-auto opacity-80" />
            <p className="ml-1">© 2026 WonderWord AI.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}