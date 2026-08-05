"use client";

import Link from "next/link";
import { Plus, Settings, Lock, LayoutDashboard, HelpCircle } from "lucide-react";

type Profile = {
  name: string;
  grade: string;
  gradient: string;
};

const PROFILES: Profile[] = [
  { name: "Emma", grade: "Grade 2", gradient: "from-orange-300 to-pink-300" },
  { name: "Nana", grade: "Kindergarten", gradient: "from-teal-300 to-sky-300" },
];

export default function ChooseProfilePage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#fdf3d8] via-[#fdeee0] to-[#fbd9d2]">
      {/* Parent dashboard entry point — kept small/unobtrusive since kids use this screen too */}
      <div className="flex justify-end px-6 pt-6">
        <Link
          href="/parent/dashboard"
          className="flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-medium text-[#5a5a5a] shadow-sm backdrop-blur transition hover:bg-white hover:text-[#2b2b2b]"
        >
          <LayoutDashboard className="h-4 w-4" />
          Parent Dashboard
        </Link>
      </div>

      <main className="mx-auto flex max-w-3xl flex-col items-center px-6 pb-20 pt-6 text-center">
        <h1 className="font-serif text-4xl font-bold text-[#a3352b] sm:text-5xl">
          Who&apos;s Reading Tonight?
        </h1>
        <p className="mt-3 max-w-md text-[#6b6b6b]">
          Choose a profile to start your magical learning journey with
          WonderWord!
        </p>

        <div className="mt-14 flex flex-wrap items-start justify-center gap-10 sm:gap-14">
          {PROFILES.map((profile) => (
            <button
              key={profile.name}
              type="button"
              className="group flex flex-col items-center gap-3"
            >
              <div
                className={`flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br ${profile.gradient} shadow-[0_10px_30px_-8px_rgba(163,53,43,0.35)] transition group-hover:scale-105 group-hover:shadow-[0_14px_36px_-8px_rgba(163,53,43,0.45)]`}
              >
                <span className="font-serif text-5xl font-bold text-white">
                  {profile.name.charAt(0)}
                </span>
              </div>
              <span className="text-base font-medium text-[#2b2b2b]">
                {profile.name}
              </span>
              <span className="rounded-full bg-[#efe9df] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#5a5a5a]">
                {profile.grade}
              </span>
            </button>
          ))}

          <Link
            href="/onboarding/step-2"
            className="group flex flex-col items-center gap-3"
          >
            <div className="flex h-40 w-40 items-center justify-center rounded-full border-2 border-dashed border-[#e0c9c6] bg-[#fdf3ee]/60 transition group-hover:border-[#a3352b] group-hover:bg-[#fbeceb]">
              <Plus className="h-8 w-8 text-[#c99b96] transition group-hover:text-[#a3352b]" />
            </div>
            <span className="text-base font-medium text-[#2b2b2b]">
              Add Child
            </span>
            <span className="text-xs text-[#a8a8a8]">—</span>
          </Link>
        </div>

        <Link
          href="/parent/manage-profiles"
          className="mt-14 flex items-center gap-2 rounded-full bg-[#a3352b] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#8c2c23]"
        >
          <Settings className="h-4 w-4" />
          Manage Profiles
        </Link>

        <p className="mt-4 flex items-center gap-1.5 text-sm text-[#8a8a8a]">
          <Lock className="h-3.5 w-3.5" />
          Parental Controls Active
        </p>
      </main>

      {/* Floating support/help launcher */}
      <Link
        href="/help"
        aria-label="Need help? Click me"
        className="group fixed bottom-6 right-6 flex items-center gap-3"
      >
        <span className="rounded-2xl rounded-br-sm bg-white px-4 py-2.5 text-sm font-medium text-[#2b2b2b] shadow-md transition group-hover:shadow-lg">
          Need help? Click me
        </span>
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#a3352b] text-white shadow-lg transition hover:bg-[#8c2c23]">
          <HelpCircle className="h-6 w-6" />
        </span>
      </Link>
    </div>
  );
}