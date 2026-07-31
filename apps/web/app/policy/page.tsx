import {
  Smile,
  ShieldCheck,
  Users,
  Database,
  KeyRound,
  Share2,
  Lock,
  Mail,
  MessageCircle,
  Eye,
  Download,
  Trash2,
} from "lucide-react";

import {
  SiSupabase,
  SiSentry,
  SiRender,
  SiVercel,
} from "@icons-pack/react-simple-icons";

const partners = [
  { name: "Supabase", Icon: SiSupabase, color: "#3ECF8E" },
  { name: "Sentry", Icon: SiSentry, color: "#362D59" },
  { name: "Render", Icon: SiRender, color: "#000000" },
  { name: "Vercel", Icon: SiVercel, color: "#000000" },
];

export default function PrivacyPolicyPage() {
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
            <a href="#" className="hover:text-[#2b2b2b]">
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

      <main className="relative mx-auto max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] px-6 py-14">
        {/* Soft radial warmth behind the hero, like the original mock */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(239,109,78,0.10),transparent_65%)]"
        />

        {/* -------------------------------------------------------------- */}
        {/* Title                                                         */}
        {/* -------------------------------------------------------------- */}
        <div className="text-center">
          <h1 className="font-serif text-4xl font-bold text-[#a3352b] md:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-xs font-semibold tracking-wider text-[#8a8a8a]">
            LAST UPDATED: JUNE 24, 2024
          </p>

          <div className="mt-4 flex items-center justify-center gap-4 text-[#c9a98f]">
            <Smile className="h-5 w-5" />
            <ShieldCheck className="h-5 w-5" />
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-12 md:flex-row">
          {/* -------------------------------------------------------------- */}
          {/* Sidebar nav                                                   */}
          {/* -------------------------------------------------------------- */}
          <aside className="shrink-0 md:w-52">
            <nav className="sticky top-8 flex flex-row flex-wrap gap-x-6 gap-y-3 text-sm md:flex-col md:gap-2">
              {[
                { id: "note", label: "A Note to Parents" },
                { id: "coppa", label: "COPPA Compliance" },
                { id: "information", label: "Information We Collect" },
                { id: "rights", label: "Parental Rights" },
                { id: "partners", label: "Third-Party Partners" },
                { id: "security", label: "Data Security" },
                { id: "contact", label: "Questions" },
              ].map((item, i) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={
                    i === 0
                      ? "border-l-2 border-[#a3352b] pl-3 font-semibold text-[#2b2b2b]"
                      : "border-l-2 border-transparent pl-3 text-[#5a5a5a] hover:text-[#2b2b2b]"
                  }
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>

          {/* -------------------------------------------------------------- */}
          {/* Content column — capped width for readability                */}
          {/* -------------------------------------------------------------- */}
          <div className="min-w-0 max-w-5xl flex-1">
        {/* Note to parents                                               */}
        {/* -------------------------------------------------------------- */}
        <section id="note" className="relative mt-10 overflow-hidden rounded-2xl border border-[#f0e6d8] bg-white p-8 shadow-[0_8px_30px_rgba(163,53,43,0.06)]">
          {/* subtle leaf/flower watermark, like the original card */}
          <svg
            aria-hidden
            viewBox="0 0 200 200"
            className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 text-[#f3e4d4]"
            fill="none"
          >
            <path
              d="M100 10c40 20 70 55 70 90s-30 80-70 90c-40-10-70-55-70-90s30-70 70-90z"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              d="M100 40c25 15 45 40 45 60s-20 50-45 60c-25-10-45-40-45-60s20-45 45-60z"
              stroke="currentColor"
              strokeWidth="3"
            />
          </svg>

          <h2 className="relative text-xl font-bold text-[#2b2b2b]">
            A Note to Parents
          </h2>
          <p className="relative mt-3 leading-relaxed text-[#5a5a5a]">
            At WonderWord AI, we believe that nurturing a child&apos;s
            imagination shouldn&apos;t come at the cost of their privacy. As
            parents and educators ourselves, we&apos;ve built this platform
            with a &ldquo;Privacy First&rdquo; philosophy. Our goal is to
            empower your child&apos;s learning journey while providing you
            with total transparency and control over your family&apos;s data.
            We treat your child&apos;s data with the same care and
            protection we give our own.
          </p>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* COPPA banner                                                  */}
        {/* -------------------------------------------------------------- */}
        <section id="coppa" className="mt-6 flex items-start gap-4 rounded-2xl bg-[#e6f5f1] p-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#1f9c86] text-[#1f9c86]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-[#12695a]">
              COPPA Certified Compliance
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-[#2f6e63]">
              WonderWord AI strictly adheres to the{" "}
              <strong>Children&apos;s Online Privacy Protection Act (COPPA)</strong>.
              We do not collect personally identifiable information from
              children under 13 without verified parental consent, and we
              never sell student or child data to third parties.
            </p>
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* 1. Information We Collect                                     */}
        {/* -------------------------------------------------------------- */}
        <section id="information" className="mt-10">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8c84a]/30 text-[#8a6d1d]">
              <Database className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold">1. Information We Collect</h2>
          </div>
          <p className="mt-3 text-[#5a5a5a]">
            To provide a personalized learning experience, we collect only
            the minimum necessary information:
          </p>
          <ul className="mt-4 space-y-3 text-[#4a4a4a]">
            <li>
              <strong className="text-[#2b2b2b]">Parental Information:</strong>{" "}
              Name, email address, and billing information (processed
              securely via Stripe).
            </li>
            <li>
              <strong className="text-[#2b2b2b]">Child Profiles:</strong>{" "}
              First names (or nicknames), age/grade level, and learning
              preferences.
            </li>
            <li>
              <strong className="text-[#2b2b2b]">Voice Data:</strong> When
              your child interacts with our AI characters, voice recordings
              are processed briefly via Twilio/OpenAI to generate text. We do
              not store raw audio files after the session ends unless you
              explicitly opt-in for &ldquo;Memory Mode.&rdquo;
            </li>
            <li>
              <strong className="text-[#2b2b2b]">Usage Data:</strong>{" "}
              Progress in word tools, stories read, and milestones achieved
              to track educational growth.
            </li>
          </ul>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* 2. Your Parental Rights                                       */}
        {/* -------------------------------------------------------------- */}
        <section id="rights" className="mt-10 rounded-2xl border border-[#f0cfc9] bg-[#fbeceb] p-7">
          <div className="flex items-center gap-3">
            <KeyRound className="h-5 w-5 text-[#a3352b]" />
            <h2 className="text-lg font-bold text-[#a3352b]">
              2. Your Parental Rights
            </h2>
          </div>
          <p className="mt-3 text-[#6b3d38]">
            You are in the driver&apos;s seat. At any time, you have the
            right to:
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <button className="flex flex-col items-center gap-2 rounded-xl border border-[#f5dcd8] bg-white px-4 py-5 text-sm font-semibold text-[#2b2b2b] shadow-[0_4px_16px_rgba(163,53,43,0.08)] transition hover:shadow-[0_6px_20px_rgba(163,53,43,0.14)]">
              <Eye className="h-5 w-5 text-[#a3352b]" />
              Access &amp; Review
            </button>
            <button className="flex flex-col items-center gap-2 rounded-xl border border-[#f5dcd8] bg-white px-4 py-5 text-sm font-semibold text-[#2b2b2b] shadow-[0_4px_16px_rgba(163,53,43,0.08)] transition hover:shadow-[0_6px_20px_rgba(163,53,43,0.14)]">
              <Download className="h-5 w-5 text-[#a3352b]" />
              Download Data
            </button>
            <button className="flex flex-col items-center gap-2 rounded-xl border border-[#f5dcd8] bg-white px-4 py-5 text-sm font-semibold text-[#2b2b2b] shadow-[0_4px_16px_rgba(163,53,43,0.08)] transition hover:shadow-[0_6px_20px_rgba(163,53,43,0.14)]">
              <Trash2 className="h-5 w-5 text-[#a3352b]" />
              Request Deletion
            </button>
          </div>

          <p className="mt-5 text-xs italic text-[#8a5a55]">
            To exercise these rights, simply visit your &ldquo;Parent
            Dashboard&rdquo; settings or email our Privacy Officer.
          </p>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* 3. Third Party Partners                                       */}
        {/* -------------------------------------------------------------- */}
        <section id="partners" className="mt-10">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#cdeee8] text-[#1f9c86]">
              <Share2 className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold">3. Third-Party Partners</h2>
          </div>
          <p className="mt-3 text-[#5a5a5a]">
            We partner with a limited number of service providers to ensure
            WonderWord runs smoothly. These partners are contractually
            obligated to never use your data for their own marketing:
          </p>

          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            {partners.map((partner) => {
              const IconComponent = partner.Icon;
              return (
                <div
                  key={partner.name}
                  className="flex items-center gap-3 rounded-xl border border-[#f0e6d8] bg-white px-4 py-4 shadow-[0_4px_16px_rgba(163,53,43,0.05)]"
                >
                  {/* Círculo do Logotipo com SVG embutido */}
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eee7db]/40 p-2">
                    <IconComponent size={18} color={partner.color} />
                  </div>
                  <span className="text-sm font-semibold text-[#3a3a3a]">
                    {partner.name}
                  </span>
                </div>
              );
            })}
          </div>
        </section>


        {/* -------------------------------------------------------------- */}
        {/* Safety tip speech bubble                                      */}
        {/* -------------------------------------------------------------- */}
        <section className="mt-8 flex items-start gap-4 rounded-2xl bg-[#f9d857] p-6">
          <div className="h-14 w-14 shrink-0 rounded-full bg-white/70" />
          <div>
            <p className="leading-relaxed text-[#5a4a10]">
              &ldquo;Roar! My friends at WonderWord make sure all your
              secrets stay safe in my digital backpack. We only keep the
              good stuff like how many new words you&apos;ve learned!&rdquo;
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[#8a731f]">
              Wonder&apos;s Safety Tip
            </p>
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* 4. Data Security                                              */}
        {/* -------------------------------------------------------------- */}
        <section id="security" className="mt-10">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e9e5df] text-[#6a6a6a]">
              <Lock className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold">4. Data Security</h2>
          </div>

          <div className="mt-4 rounded-xl bg-[#2b2b2b] p-5 font-mono text-xs leading-relaxed text-[#8fe3c9]">
            <p>hcshbcibciuvovubucjd</p>
            <p>;lmknjbhvgcxezxrctvybunmk</p>
            <p>,ominubyvtcrxezwexcvghbjnkml,minubyvtc</p>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-xs font-semibold text-[#1f9c86]">
              <span>Encryption Strength</span>
              <span>Military Grade</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-[#e9e5df]">
              <div className="h-2 w-[97%] rounded-full bg-[#1f9c86]" />
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* Questions / CTA                                               */}
        {/* -------------------------------------------------------------- */}
        <section id="contact" className="mt-14 text-center">
          <h2 className="text-2xl font-bold">Questions?</h2>
          <p className="mx-auto mt-2 max-w-md text-[#5a5a5a]">
            We&apos;re here to help clarify any part of our policy. Reach
            out to our dedicated support team.
          </p>

          <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button className="flex items-center gap-2 rounded-full bg-[#a3352b] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#8c2c23]">
              <Mail className="h-4 w-4" />
              Email Privacy Officer
            </button>
            <button className="flex items-center gap-2 rounded-full bg-[#12695a] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f574a]">
              <MessageCircle className="h-4 w-4" />
              Live Help Desk
            </button>
          </div>
        </section>
          </div>
        </div>
      </main>

      {/* ---------------------------------------------------------------- */}
      {/* Footer                                                           */}
      {/* ---------------------------------------------------------------- */}
      <footer className="border-t border-[#f0e6d8] bg-white py-8">
        <div className="mx-auto flex max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] flex-col items-center justify-between gap-4 px-6 text-sm text-[#8a8a8a] md:flex-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div>
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