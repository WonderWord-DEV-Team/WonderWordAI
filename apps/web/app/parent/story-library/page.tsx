import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Rocket } from "lucide-react";
import { requireRole } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Story Library"
};

export const dynamic = "force-dynamic";

export default async function StoryLibraryPage() {
  await requireRole("PARENT");

  return (
    <div className="min-h-screen bg-[#F4F1EA]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-lg font-bold text-rose-500"
          >
            <Rocket className="h-5 w-5" />
            WonderWord AI
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-slate-500">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <Link href="/parent/dashboard" className="hover:text-slate-900">Diagnostics</Link>
            <span className="font-semibold text-rose-500">Story Library</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <section className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-rose-100 text-rose-500">
            <BookOpen className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-3xl font-black text-slate-900">Story Library</h1>
          <p className="mx-auto mt-3 max-w-lg text-slate-600">
            No saved stories are available yet. Stories generated during a child reading
            session will appear here once library storage is connected.
          </p>
          <Link
            href="/parent/dashboard"
            className="mt-7 inline-flex rounded-full bg-rose-500 px-6 py-3 text-sm font-bold text-white hover:bg-rose-600"
          >
            Back to dashboard
          </Link>
        </section>
      </main>
    </div>
  );
}
