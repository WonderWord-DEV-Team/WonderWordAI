"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Lock, LayoutDashboard, HelpCircle, X } from "lucide-react";
import { startChildSession, addChildProfile } from "./actions";

type ChildProfileRow = {
  child_id: string;
  name: string;
  grade: number;
};

const GRADIENTS = [
  "from-orange-300 to-pink-300",
  "from-teal-300 to-sky-300",
  "from-purple-300 to-fuchsia-300",
  "from-amber-300 to-red-300"
];

function gradientFor(index: number) {
  return GRADIENTS[index % GRADIENTS.length];
}

const READING_LEVEL_OPTIONS = [
  { id: "starting", label: "Just starting" },
  { id: "simple", label: "Simple words" },
  { id: "help", label: "With help" },
  { id: "independent", label: "Independent" }
];

export function ProfileGrid({ profiles }: { profiles: ChildProfileRow[] }) {
  const router = useRouter();
  const [loadingChildId, setLoadingChildId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddChild, setShowAddChild] = useState(false);

  const handleSelectProfile = async (childId: string) => {
    setLoadingChildId(childId);
    setError(null);

    const result = await startChildSession(childId);

    if (!result.success) {
      setError(result.error || "Could not start this profile.");
      setLoadingChildId(null);
      return;
    }

    router.push("/child");
  };

  return (
    <div className="relative min-h-screen bg-[radial-gradient(circle_at_center,_#FFF5E6_0%,_#FFDAD8_100%)]">
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
          Choose a profile to start your magical learning journey with WonderWord!
        </p>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-[#a3352b]">
            {error}
          </p>
        ) : null}

        <div className="mt-14 flex flex-wrap items-start justify-center gap-10 sm:gap-14">
          {profiles.map((profile, index) => (
            <button
              key={profile.child_id}
              type="button"
              disabled={loadingChildId !== null}
              onClick={() => handleSelectProfile(profile.child_id)}
              className="group flex flex-col items-center gap-3 disabled:opacity-60"
            >
              <div
                className={`flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br ${gradientFor(
                  index
                )} shadow-[0_10px_30px_-8px_rgba(163,53,43,0.35)] transition group-hover:scale-105 group-hover:shadow-[0_14px_36px_-8px_rgba(163,53,43,0.45)]`}
              >
                <span className="font-serif text-5xl font-bold text-white">
                  {profile.name.charAt(0)}
                </span>
              </div>
              <span className="text-base font-medium text-[#2b2b2b]">
                {loadingChildId === profile.child_id ? "Starting..." : profile.name}
              </span>
              <span className="rounded-full bg-[#efe9df] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#5a5a5a]">
                Grade {profile.grade}
              </span>
            </button>
          ))}

          <button
            type="button"
            onClick={() => setShowAddChild(true)}
            className="group flex flex-col items-center gap-3"
          >
            <div className="flex h-40 w-40 items-center justify-center rounded-full border-2 border-dashed border-[#e0c9c6] bg-[#fdf3ee]/60 transition group-hover:border-[#a3352b] group-hover:bg-[#fbeceb]">
              <Plus className="h-8 w-8 text-[#c99b96] transition group-hover:text-[#a3352b]" />
            </div>
            <span className="text-base font-medium text-[#2b2b2b]">Add Child</span>
            <span className="text-xs text-[#a8a8a8]">—</span>
          </button>
        </div>

        <p className="mt-4 flex items-center gap-1.5 text-sm text-[#8a8a8a]">
          <Lock className="h-3.5 w-3.5" />
          Parental Controls Active
        </p>
      </main>

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

      {showAddChild ? (
        <AddChildModal
          onClose={() => setShowAddChild(false)}
          onCreated={() => {
            setShowAddChild(false);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function AddChildModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState("");
  const [readingLevel, setReadingLevel] = useState("starting");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await addChildProfile({ nickname, age, readingLevel });

    if (!result.success) {
      setError(result.error || "Could not add this child.");
      setIsSubmitting(false);
      return;
    }

    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-[#2b2b2b]">Add a child</h2>
          <button type="button" onClick={onClose} className="text-[#a8a8a8] hover:text-[#2b2b2b]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="nickname" className="mb-1.5 block text-sm font-medium text-[#2b2b2b]">
              Nickname
            </label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full rounded-xl border border-[#ece6da] bg-[#faf7f2] px-4 py-3 text-sm text-[#2b2b2b] focus:border-[#a3352b] focus:outline-none focus:ring-2 focus:ring-[#a3352b]/20"
            />
          </div>

          <div>
            <label htmlFor="age" className="mb-1.5 block text-sm font-medium text-[#2b2b2b]">
              Age
            </label>
            <select
              id="age"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full rounded-xl border border-[#ece6da] bg-[#faf7f2] px-4 py-3 text-sm text-[#2b2b2b] focus:border-[#a3352b] focus:outline-none focus:ring-2 focus:ring-[#a3352b]/20"
            >
              <option value="" disabled>
                Select age
              </option>
              {Array.from({ length: 9 }, (_, i) => i + 4).map((a) => (
                <option key={a} value={a}>
                  {a} years old
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-[#2b2b2b]">Reading Level</p>
            <div className="grid grid-cols-2 gap-2">
              {READING_LEVEL_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setReadingLevel(opt.id)}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                    readingLevel === opt.id
                      ? "border-[#a3352b] bg-[#fbeceb] text-[#a3352b]"
                      : "border-[#ece6da] text-[#5a5a5a]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error ? <p className="text-sm font-bold text-[#a3352b]">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting || !nickname.trim() || !age}
            className="w-full rounded-full bg-[#a3352b] py-3 text-sm font-semibold text-white transition hover:bg-[#8c2c23] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? "Adding..." : "Add Child"}
          </button>
        </form>
      </div>
    </div>
  );
}