"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useChildSession } from "@/components/child/ChildSessionContext";
import type { AuthContext } from "@/lib/auth/types";

type ReadingResultsShellProps = {
  auth: AuthContext;
};

export function ReadingResultsShell({ auth }: ReadingResultsShellProps) {
  const router = useRouter();
  const { latestTranscription, worksheetText } = useChildSession();

  const words = latestTranscription?.words ?? [];
  const miscues = latestTranscription?.miscues ?? [];
  const miscueWordSet = new Set(miscues.map((m) => m.word.toLowerCase()));
  const correctCount = words.filter((w) => !miscueWordSet.has(w.word.toLowerCase())).length;

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

        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-8">
          {miscues.length === 0 && words.length > 0 ? "Great reading! 🎉" : "Your reading results"}
        </h1>

        {!latestTranscription ? (
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
        ) : (
          <>
            <div className="mb-8 grid grid-cols-3 gap-4">
              <div className="rounded-2xl bg-[#F5A623] p-4 text-white">
                <p className="text-xs font-bold uppercase tracking-wide">Words Read</p>
                <p className="mt-1 text-2xl font-black">{words.length}</p>
              </div>
              <div className="rounded-2xl bg-[#0F9C8E] p-4 text-white">
                <p className="text-xs font-bold uppercase tracking-wide">Correct</p>
                <p className="mt-1 text-2xl font-black">{correctCount}</p>
              </div>
              <div className="rounded-2xl bg-[#E8604F] p-4 text-white">
                <p className="text-xs font-bold uppercase tracking-wide">To Practice</p>
                <p className="mt-1 text-2xl font-black">{miscues.length}</p>
              </div>
            </div>

            {miscues.length > 0 ? (
              <div className="mb-8 rounded-[24px] border border-[#ecdfc9]/60 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-black">Words to practice</h2>
                <ul className="flex flex-wrap gap-2">
                  {miscues.map((miscue, index) => (
                    <li
                      key={`${miscue.word}-${index}`}
                      className="rounded-full border border-[#a3352b]/30 bg-[#fbeceb] px-4 py-2 text-sm font-black text-[#a3352b]"
                    >
                      {miscue.word}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="rounded-[24px] border border-[#ecdfc9]/60 bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-lg font-black">What you read</h2>
              <p className="text-base leading-7 text-[#4a4a4a]">
                {latestTranscription.transcript || worksheetText || "—"}
              </p>
            </div>

            <div className="mt-10 flex justify-center gap-4">
              <button
                type="button"
                onClick={() => router.push("/child")}
                className="rounded-full bg-[#ff6868] px-8 py-3 text-base font-black text-white shadow-sm transition hover:bg-[#ef5353]"
              >
                Read another worksheet
              </button>
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
