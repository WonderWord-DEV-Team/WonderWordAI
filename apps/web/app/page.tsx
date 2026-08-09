"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type Benefit = {
  emoji: string;
  title: string;
  desc: string;
  span?: boolean;
  comingSoon?: boolean;
};

const benefits: Benefit[] = [
  {
    emoji: "📸",
    title: "Scan & Read",
    desc: "Snap a photo of any worksheet and WonderWord turns it into an interactive reading session. When your child stumbles on a word, it becomes a quick, playful practice moment.",
    span: true,
  },
  {
    emoji: "🌍",
    title: "Themed Story Worlds",
    desc: "Pick a theme and watch WonderWord create a brand-new story just for your child — then explore it by reading along, typing it out to practice spelling, or listening to it narrated aloud.",
    span: true,
  },
  {
    emoji: "🔍",
    title: "Word Explorer",
    desc: "Type any word and get a simple, kid-friendly definition with a picture to match.",
  },
  {
    emoji: "🎨",
    title: "Word Vision",
    desc: "Watch any word come to life as a fun, colorful illustration made just for that word.",
  },
  {
    emoji: "📊",
    title: "Parent Dashboard",
    desc: "Biweekly progress reports without the \"How was school?\" struggle — see reading speed, accuracy, and focus areas at a glance, with printable practice activities.",
    span: true,
  },
  {
    emoji: "🎙️",
    title: "Read Aloud",
    desc: "Practice reading out loud anytime, even without a worksheet on hand.",
    comingSoon: true,
  },
  {
    emoji: "🎵",
    title: "Word Beats",
    desc: "Turn any word into a fun, catchy song.",
    comingSoon: true,
  },
];

const steps = [
  { number: 1, emoji: "📁", title: "Upload a Worksheet", desc: "Snap a photo or upload any homework sheet" },
  {
    number: 2,
    emoji: "🎙️",
    title: "Read It Aloud",
    desc: "Your child reads the page out loud and submits the recording. If they stumble on a word, WonderWord turns it into a quick, playful practice moment.",
  },
  {
    number: 3,
    emoji: "📊",
    title: "You Get a Progress Report",
    desc: "Every two weeks, a clear report appears right in your Parent Dashboard — no jargon, just insights.",
  },
];

const plans = [
  {
    name: "FREE",
    cardStyle: "bg-white border border-gray-200",
    textStyle: "text-gray-900",
  },
  {
    name: "PLAN 1",
    cardStyle: "bg-[#E8604F]",
    textStyle: "text-white",
  },
  {
    name: "PLAN 2",
    cardStyle: "bg-[#F5A623]",
    textStyle: "text-[#1A1A2E]",
  },
];

const reviews = [
  {
    quote:
      "My son used to cry over reading homework. Now he asks for the 'robot game' before I even bring out the papers!",
    name: "Sarah M.",
    avatarColor: "bg-[#F7C6BE]",
  },
  {
    quote:
      "The progress reports are so detailed. I can actually see which phonics rules he's struggling with without having to guess.",
    name: "James K.",
    avatarColor: "bg-[#B9EFE0]",
  },
  {
    quote:
      "WonderWord has made our evenings so much more peaceful. It's safe, educational, and genuinely fun for the kids.",
    name: "Priya L.",
    avatarColor: "bg-[#FBF0C7]",
  },
];

const faqs = [
  {
    question: "Is WonderWord safe for my child?",
    answer:
      "Yes. Every child profile is created and managed by a parent — children never sign up on their own. We don't sell data, and reading sessions are designed with child privacy in mind from the ground up.",
  },
  {
    question: "What grade levels does it support?",
    answer:
      "WonderWord is built for early readers, from Kindergarten through 5th grade (K-5).",
  },
  {
    question: "How does the AI reading coach work?",
    answer:
      "Your child scans a worksheet, then reads it aloud. WonderWord listens in real time, highlights each word as it's read, and gently flags words that need more practice — then turns that into a biweekly report and personalized practice ideas for you.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer:
      "Yes — you'll be able to manage or cancel your subscription anytime from your Parent Dashboard, with no long-term contract required.",
  },
  {
    question: "Do I need any special equipment?",
    answer:
      "No special equipment needed — just a device with a camera (to scan worksheets) and a microphone (for reading aloud). Everything runs right in your browser.",
  },
];

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main className="relative overflow-hidden bg-[#FFF9F2]">
      {/* Decorative doodle background — subtle, single ink tone, low opacity */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="doodle-pattern"
            width="220"
            height="220"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-6)"
          >
            {/* open book */}
            <g transform="translate(20, 30)" stroke="#1A1A2E" strokeOpacity="0.06" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M0 6 C8 0, 20 0, 26 6 L26 24 C20 19, 8 19, 0 24 Z" />
              <path d="M26 6 C32 0, 44 0, 52 6 L52 24 C44 19, 32 19, 26 24 Z" />
            </g>

            {/* star */}
            <g transform="translate(165, 35) scale(1.6)" stroke="#E8604F" strokeOpacity="0.07" strokeWidth="1.4" fill="none" strokeLinejoin="round">
              <path d="M0 -10 L2.9 -3.5 L10 -3 L4.5 1.5 L6 8.5 L0 5 L-6 8.5 L-4.5 1.5 L-10 -3 L-2.9 -3.5 Z" />
            </g>

            {/* pencil */}
            <g transform="translate(35, 155)" stroke="#0F9C8E" strokeOpacity="0.07" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M0 24 L18 6 L24 12 L6 30 Z" />
              <path d="M18 6 L24 0 L30 6 L24 12 Z" />
            </g>

            {/* speech bubble */}
            <g transform="translate(155, 150)" stroke="#F5A623" strokeOpacity="0.07" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="0" y="0" width="30" height="20" rx="7" />
              <path d="M7 20 L4 27 L14 20" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#doodle-pattern)" />
      </svg>

      {/* All existing page content wraps in this relative layer */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-[#ecdfc9] bg-white">
          <div className="mx-auto flex max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] items-center justify-between px-6 py-4">
            <Link href="/">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="WonderWord AI" className="h-8 w-auto cursor-pointer" />
            </Link>

            <nav className="absolute left-1/2 hidden -translate-x-1/2 gap-8 text-sm font-medium text-[#4a4a4a] md:flex">
              <a href="/" className="border-b-2 border-[#a3352b] pb-1 font-bold text-[#2b2b2b]">
                Home
              </a>
              <a href="#how-it-works" className="hover:text-[#2b2b2b]">
                How it Works
              </a>
              <a href="#pricing" className="hover:text-[#2b2b2b]">
                Pricing
              </a>
            </nav>

            <Link
              href="/auth/login"
              className="rounded-full border border-[#ecdfc9] px-6 py-2.5 text-sm font-bold text-[#2b2b2b] transition hover:bg-[#faf7f2]"
            >
              Login
            </Link>
          </div>
        </header>


        {/* Hero */}
        <section className="px-6 sm:px-12 pt-12 pb-20">
          <span className="inline-block bg-[#F9D65C] text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full text-gray-800">
            Notice!
          </span>

          <div className="mt-6 grid sm:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-[42px] sm:text-[52px] font-black text-[#1A1A2E] leading-[1.08]">
                AI Reading Coach
                <br />
                for K–5 Kids
              </h1>
              <p className="mt-5 max-w-md text-[15px] leading-6 text-gray-500">
                Transform stressful, dry at-home reading assignments into interactive, narrative-driven play.
              </p>

              <div className="mt-7 flex flex-wrap gap-4">
                <Link
                  href="#pricing"
                  className="rounded-full bg-[#E8604F] px-7 py-3.5 text-white font-black text-[15px] hover:bg-[#d9543f]"
                >
                  Start Free Trial
                </Link>
                <Link
                  href="/auth/login"
                  className="rounded-full bg-[#B9EFE0] px-7 py-3.5 text-gray-800 font-black text-[15px] hover:bg-[#a5e8d5]"
                >
                  Log In
                </Link>
              </div>

              <p className="mt-6 text-[13px] font-bold text-[#0F9C8E]">
                real-time feedback &nbsp;·&nbsp; biweekly reports &nbsp;·&nbsp; activity recommendations
              </p>
            </div>

            <div className="relative bg-[#FDF1E7] rounded-[28px] h-72 flex items-center justify-center overflow-visible">
              <img
                src="/landing-assets/kids-reading.png"
                alt="Illustration of children reading together"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          </div>
        </section>

        {/* Benefits — reflects real, shipped features */}
        <section className="px-6 sm:px-12 py-20">
          <h2 className="text-center text-[32px] font-serif text-[#a3352b] font-bold">
            Magic in Every Page
          </h2>

          <div className="mt-12 grid sm:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {benefits.map((b) => (
              <div
                key={b.title}
                className={`relative rounded-3xl p-7 min-h-[160px] ${b.comingSoon
                  ? "bg-[#F2F2F2] opacity-80"
                  : b.title === "Word Vision"
                    ? "bg-[#CFF2E8]"
                    : b.title === "Word Explorer"
                      ? "bg-[#FBF0C7]"
                      : "bg-[#F2F2F2]"
                  } ${b.span ? "sm:col-span-2" : ""}`}
              >
                {b.comingSoon ? (
                  <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-white">
                    Coming soon
                  </span>
                ) : null}
                <p className="text-2xl">{b.emoji}</p>
                <h3 className="mt-4 text-xl font-black text-[#1A1A2E]">
                  {b.title}
                </h3>
                <p className="mt-2 text-sm leading-5 text-gray-600 max-w-sm">
                  {b.desc}
                </p>
                {b.title === "Parent Dashboard" && (
                  <div className="mt-4 bg-white rounded-xl p-4 shadow-sm w-full sm:w-44">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-500">Weekly Goal</span>
                      <span className="font-black text-[#0F9C8E]">85%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-[#0F9C8E]"
                        style={{ width: "85%" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="px-6 sm:px-12 py-20">
          <h2 className="text-center text-[32px] font-serif text-[#a3352b] font-bold">
            How It Works
          </h2>
          <p className="mt-2 text-center text-[15px] text-gray-500">
            3 simple steps — no tech skills needed
          </p>

          <div className="mt-14 relative max-w-4xl mx-auto">
            <div className="hidden sm:block absolute top-6 left-[16%] right-[16%] border-t-2 border-dashed border-[#E8604F]/40" />
            <div className="grid sm:grid-cols-3 gap-10 text-center relative">
              {steps.map((s) => (
                <div key={s.number}>
                  <div className="mx-auto w-12 h-12 rounded-full bg-[#9B2C2C] text-white text-lg font-black flex items-center justify-center relative z-10">
                    {s.number}
                  </div>
                  <p className="mt-4 text-3xl">{s.emoji}</p>
                  <h3 className="mt-3 font-black text-[#1A1A2E]">{s.title}</h3>
                  <p className="mt-2 text-sm leading-5 text-gray-500 max-w-[220px] mx-auto">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing — not finalized yet */}
        <section id="pricing" className="px-6 sm:px-12 py-20">
          <h2 className="text-center text-[32px] font-serif font-bold text-[#a3352b]">
            Simple, Honest Pricing
          </h2>
          <p className="mt-2 text-center text-[15px] text-gray-500">
            We&apos;re still finalizing plan details — pricing is coming soon.
          </p>

          <div className="mt-10 grid sm:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-3xl p-7 ${plan.cardStyle} ${plan.textStyle}`}
              >
                <p className="font-black text-base">{plan.name}</p>
                <p className="mt-2 text-4xl font-black">???</p>

                <div className="mt-5 rounded-2xl border border-dashed border-current/30 px-4 py-6 text-center text-sm font-bold opacity-80">
                  Stay tuned! We haven&apos;t finalized pricing or plan features yet.
                </div>

                <button
                  disabled
                  aria-disabled="true"
                  className="mt-7 w-full cursor-not-allowed rounded-full border border-current/30 py-3 font-black text-sm opacity-60"
                >
                  Coming Soon
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="px-6 sm:px-12 py-20">
          <h2 className="text-center text-[32px] font-bold font-serif text-[#a3352b]">
            Parents Love WonderWord
          </h2>

          <div className="mt-12 grid sm:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {reviews.map((r) => (
              <div
                key={r.name}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
              >
                <p className="text-[#F5A623] text-sm tracking-wide">★★★★★</p>
                <p className="mt-3 text-sm leading-6 italic text-gray-600">
                  &ldquo;{r.quote}&rdquo;
                </p>
                <div className="mt-5 flex items-center gap-2">
                  <span className={`w-8 h-8 rounded-full ${r.avatarColor}`} />
                  <p className="text-sm font-bold text-gray-800">{r.name}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="px-6 sm:px-12 py-20">
          <h2 className="text-center text-[32px] font-bold font-serif text-[#a3352b]">
            Questions? We&apos;ve got answers.
          </h2>

          <div className="mt-12 max-w-2xl mx-auto grid gap-3">
            {faqs.map((faq, i) => (
              <div
                key={faq.question}
                className="rounded-2xl border border-gray-200 bg-white overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  className="w-full flex items-center justify-between px-6 py-4 text-left text-sm font-bold text-gray-800 hover:bg-gray-50"
                >
                  {faq.question}
                  <span className="text-gray-400">
                    {openFaq === i ? "︿" : "﹀"}
                  </span>
                </button>
                {openFaq === i ? (
                  <p className="px-6 pb-4 text-sm leading-6 text-gray-600">
                    {faq.answer}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {/* CTA band */}
        <section className="bg-[#9B2335] text-white text-center py-20 px-6">
          <h2 className="text-2xl sm:text-[32px] font-black max-w-lg mx-auto leading-tight">
            Ready to make reading feel like an adventure?
          </h2>

          <Link
            href="/auth/login"
            className="mt-7 inline-block rounded-full bg-white text-[#9B2335] font-black px-8 py-3.5 hover:bg-gray-100"
          >
            Start Free Today
          </Link>
          <p className="mt-3 text-xs text-white/80 font-semibold">
            No credit card required
          </p>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Footer — standard app pattern                                    */}
        {/* ---------------------------------------------------------------- */}
        <footer className="border-t border-[#f0e6d8] bg-white py-8">
          <div className="mx-auto flex max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] flex-col items-center justify-between gap-4 px-6 text-sm text-[#8a8a8a] md:flex-row">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="WonderWord AI" className="h-6 w-auto opacity-80" />
              <p className="ml-1 mt-1">© 2026 WonderWord AI.</p>
            </div>
            <div className="flex gap-5">
              <Link href="/privacy" className="hover:text-[#2b2b2b]">Privacy</Link>
              <Link href="/terms" className="hover:text-[#2b2b2b]">Terms</Link>
              <a href="#" className="hover:text-[#2b2b2b]">Support</a>
              <a href="#" className="hover:text-[#2b2b2b]">About Us</a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}