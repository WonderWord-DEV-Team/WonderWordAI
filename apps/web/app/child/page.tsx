import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  getE2eAuthState,
  getE2eChildProfile,
  getE2eSiblingProfiles,
  isE2eMode
} from "@/lib/e2e/fixtures";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ChildHomeClient } from "./ChildHomeClient";

export const dynamic = "force-dynamic";

export default async function ChildHomePage() {
  if (isE2eMode()) {
    const auth = getE2eAuthState(cookies());
    if (auth.status !== "authenticated" || auth.appUser.role !== "CHILD") {
      redirect("/auth/login");
    }

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
    href: null,
    action: "read-aloud"
    const profile = getE2eChildProfile(auth.appUser.id);
    return (
      <ChildHomeClient
        childName={profile?.name ?? "Reader"}
        siblings={getE2eSiblingProfiles(auth.appUser.id)}
      />
    );
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: childUser } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .eq("role", "CHILD")
    .single();

  if (!childUser) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("child_profiles")
    .select("name")
    .eq("child_id", childUser.id)
    .single();

  const admin = createAdminClient();
  const { data: parentLink } = await admin
    .from("parent_child")
    .select("parent_id")
    .eq("child_id", childUser.id)
    .maybeSingle();

  let siblings: { child_id: string; name: string }[] = [];
  if (parentLink) {
    const { data: allLinks } = await admin
      .from("parent_child")
      .select("child_id")
      .eq("parent_id", parentLink.parent_id);

    const otherChildIds = (allLinks ?? [])
      .map((l) => l.child_id)
      .filter((id) => id !== childUser.id);

    if (otherChildIds.length > 0) {
      const { data: siblingProfiles } = await admin
        .from("child_profiles")
        .select("child_id, name")
        .in("child_id", otherChildIds);

      siblings = siblingProfiles ?? [];
    }
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

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-600">
              <span>⭐</span>
              1,240
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-300 to-pink-300" />
              <span className="text-sm font-medium">Emma</span>
            </div>
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
          {/* Snap homework — REAL */}
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

          {/* Today's Goal + Weekly Challenge — Coming Soon */}
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

        {/* Word of the Day — Coming Soon */}
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

        {/* Daily Refresh */}
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
                <div
                  key={card.title}
                  className={`relative rounded-2xl ${card.accent} p-5 opacity-70`}
                >
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

        {/* Thematic stories — where "Recently Read" would be — Coming Soon */}
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

      {/* ---------------------------------------------------------------- */}
      {/* Footer                                                           */}
      {/* ---------------------------------------------------------------- */}
      <footer className="border-t border-[#f0e6d8] bg-white py-8">
        <div className="mx-auto flex max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] flex-col items-center justify-between gap-4 px-6 text-sm text-[#8a8a8a] md:flex-row">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="WonderWord AI" className="h-6 w-auto opacity-80" />
            <p className="ml-1">© 2026 WonderWord AI.</p>
          </div>
          <div className="flex gap-5">
            <a href="#" className="hover:text-[#2b2b2b]">
              Privacy
            </a>
            <a href="/terms" className="hover:text-[#2b2b2b]">
              Terms
            </a>
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
