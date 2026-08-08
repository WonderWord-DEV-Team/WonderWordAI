"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type BillingCycle = "monthly" | "yearly";

const benefits = [
  { tag: "Interactive Scanning", title: "Scan any worksheet", desc: null, span: true },
  { tag: "🎤", title: "Karaoke Mode", desc: "Real-time highlighting as your child reads out loud.", span: false },
  { tag: "⭐", title: "Rewards & Badges", desc: null, span: false },
  {
    tag: null,
    title: "Parent Dashboard",
    desc: 'Weekly progress reports without the "How was school?" struggle. See new words mastered and speed improvements at a glance.',
    span: true,
  },
];

const steps = [
  { number: 1, emoji: "📁", title: "Upload a Worksheet", desc: "Snap a photo or upload any homework sheet" },
  {
    number: 2,
    emoji: "🎙️",
    title: "Your Child Reads Aloud",
    desc: "Our AI listens and turns the page into an interactive story in real time",
  },
  {
    number: 3,
    emoji: "📊",
    title: "You Get a Progress Report",
    desc: "Every two weeks, a clear report lands in your inbox — no jargon, just insights",
  },
];

const plans = [
  {
    name: "FREE",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: ["1 child", "5 sessions/week", "Basic stats"],
    cta: "Start Free",
    cardStyle: "bg-white border border-gray-200",
    textStyle: "text-gray-900",
    ctaStyle: "border border-[#E8604F] text-[#E8604F] hover:bg-[#E8604F]/5",
    checkColor: "text-[#0F9C8E]",
  },
  {
    name: "PLAN 1",
    monthlyPrice: 9.99,
    yearlyPrice: 8.29,
    badge: "MOST POPULAR",
    features: [
      "Unlimited scans",
      "Claude Sonnet correction stories",
      "Biweekly reports",
      "Activity recommendations",
      "SMS notifications",
      "1-year data retention",
    ],
    cta: "Start Free Trial",
    cardStyle: "bg-[#E8604F]",
    textStyle: "text-white",
    ctaStyle: "bg-white text-[#E8604F] hover:bg-gray-100",
    checkColor: "text-white",
  },
  {
    name: "PLAN 2",
    monthlyPrice: 17.99,
    yearlyPrice: 14.93,
    features: [
      "Plan 1 features",
      "Unlimited children",
      "Multi-child dashboard",
      "Side-by-side WCPM, accuracy, engagement",
      "Separate reports per child",
    ],
    cta: "Get Started",
    cardStyle: "bg-[#F5A623]",
    textStyle: "text-[#1A1A2E]",
    ctaStyle: "bg-[#E8604F] text-white hover:bg-[#d9543f]",
    checkColor: "text-[#1A1A2E]",
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

const questions = [
  "Is WonderWord safe for my child?",
  "What grade levels does it support?",
  "How does the AI reading coach work?",
  "Can I cancel my subscription anytime?",
  "Do I need any special equipment?",
];

const storyWorlds = [
  { name: "Space", color: "#2260e6", emoji: "🚀", cta: "Blast off →" },
  { name: "Dinos", color: "#10a84e", emoji: "🦕", cta: "Roar in →" },
  { name: "Fairy Tale", color: "#d2237d", emoji: "🏰", cta: "Believe →" },
  { name: "Heroes", color: "#e65100", emoji: "🦸", cta: "Save day →" },
  { name: "Food", color: "#6b21a8", emoji: "🍕", cta: "Taste it →" },
  { name: "Animals", color: "#e6a100", emoji: "🐾", cta: "Meet them →" },
];

export default function Home() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main className="bg-[#FFF9F2]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 sm:px-12 py-6">
        <Image
          src="/landing-assets/logo.svg"
          alt="WonderWord AI"
          width={170}
          height={38}
          priority
        />
        <nav className="hidden sm:flex items-center gap-10 text-sm font-semibold text-gray-600">
          <a
            href="#"
            className="text-[#E8604F] border-b-2 border-[#E8604F] pb-1"
          >
            Home
          </a>
          <a href="#how-it-works" className="hover:text-[#E8604F]">
            How it Works
          </a>
          <a href="#pricing" className="hover:text-[#E8604F]">
            Pricing
          </a>
        </nav>
        <Link
          href="/auth/login"
          className="rounded-full border border-gray-300 px-6 py-2.5 text-sm font-bold text-gray-800 hover:bg-white"
        >
          Login
        </Link>
      </header>

      {/* Hero */}
      <section className="px-6 sm:px-12 pt-4 pb-20">
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
            <div className="flex gap-2 items-end">
              <div className="w-16 h-24 rounded-2xl bg-white/60" />
              <div className="w-16 h-28 rounded-2xl bg-white/60" />
              <div className="w-16 h-24 rounded-2xl bg-white/60" />
              <div className="w-16 h-28 rounded-2xl bg-white/60" />
            </div>
            <div className="absolute bottom-10 right-6 bg-white rounded-2xl px-4 py-3 shadow-lg text-xs font-bold text-gray-700 max-w-[140px]">
              &ldquo;Let&apos;s read your homework today!&rdquo;
            </div>
            <div className="absolute bottom-6 left-8 w-11 h-11 rounded-full border-2 border-[#0F9C8E] bg-white flex items-center justify-center text-lg">
              🤖
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="px-6 sm:px-12 py-20">
        <h2 className="text-center text-[32px] font-black text-[#1A1A2E]">
          Magic in Every Page
        </h2>

        <div className="mt-12 grid sm:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {benefits.map((b) => (
            <div
              key={b.title}
              className={`rounded-3xl p-7 min-h-[160px] ${
                b.title === "Karaoke Mode"
                  ? "bg-[#CFF2E8]"
                  : b.title === "Rewards & Badges"
                  ? "bg-[#FBF0C7]"
                  : "bg-[#F2F2F2]"
              } ${b.span ? "sm:col-span-2" : ""}`}
            >
              {b.tag && b.title === "Scan any worksheet" && (
                <span className="inline-block bg-[#FBD6D0] text-[#C4483A] text-[11px] font-black uppercase px-3 py-1 rounded-full">
                  {b.tag}
                </span>
              )}
              {b.tag && b.title !== "Scan any worksheet" && (
                <p className="text-2xl">{b.tag}</p>
              )}
              <h3 className="mt-4 text-xl font-black text-[#1A1A2E]">
                {b.title}
              </h3>
              {b.desc && (
                <p className="mt-2 text-sm leading-5 text-gray-600 max-w-sm">
                  {b.desc}
                </p>
              )}
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

      {/* Choose Your Adventure */}
      <section className="px-6 sm:px-12 py-20 bg-gradient-to-b from-[#FFF9F2] to-[#FFF0E6]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-center text-[32px] font-black text-[#1A1A2E]">Choose Your Adventure!</h2>
          <p className="mt-2 text-center text-[15px] text-gray-500">Every story is built from your imagination — pick a world!</p>

          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {storyWorlds.map((world) => (
              <button
                key={world.name}
                type="button"
                className="group flex flex-col items-center gap-3 rounded-2xl p-5 text-white transition hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{ backgroundColor: world.color }}
              >
                <span className="text-3xl">{world.emoji}</span>
                <span className="text-sm font-black text-center">{world.name}</span>
                <span className="text-[11px] font-bold mt-1 text-white/90 group-hover:text-white">{world.cta}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-6 sm:px-12 py-20">
        <h2 className="text-center text-[32px] font-black text-[#1A1A2E]">
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

      {/* Pricing — working Monthly/Annual toggle */}
      <section id="pricing" className="px-6 sm:px-12 py-20">
        <h2 className="text-center text-[32px] font-black text-[#1A1A2E]">
          Simple, Honest Pricing
        </h2>
        <p className="mt-2 text-center text-[15px] text-gray-500">
          Start free. Upgrade when you&apos;re ready.
        </p>

        <div className="mt-6 flex justify-center">
          <div className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-full p-1">
            <button
              type="button"
              onClick={() => setCycle("monthly")}
              aria-pressed={cycle === "monthly"}
              className={`min-h-[48px] px-4 py-1.5 rounded-full text-sm font-bold transition ${
                cycle === "monthly"
                  ? "bg-[#1A1A2E] text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setCycle("yearly")}
              aria-pressed={cycle === "yearly"}
              className={`min-h-[48px] px-4 py-1.5 rounded-full text-sm font-bold transition ${
                cycle === "yearly"
                  ? "bg-[#1A1A2E] text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Annual
            </button>
            <span className="ml-1 mr-1 bg-[#0F9C8E] text-white text-[10px] font-black px-2 py-1 rounded-full">
              SAVE 17%
            </span>
          </div>
        </div>

        <div className="mt-10 grid sm:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
          {plans.map((plan) => {
            const price =
              cycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
            return (
              <div
                key={plan.name}
                className={`relative rounded-3xl p-7 ${plan.cardStyle} ${plan.textStyle}`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1A1A2E] text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-full whitespace-nowrap">
                    {plan.badge}
                  </span>
                )}
                <p className="font-black text-base">{plan.name}</p>
                <p className="mt-2 text-4xl font-black">
                  ${price.toFixed(2)}
                  <span className="text-sm font-bold">/mo</span>
                </p>
                {cycle === "yearly" && price > 0 && (
                  <p className="mt-1 text-xs font-bold opacity-80">
                    Billed annually
                  </p>
                )}
                <ul className="mt-5 space-y-2.5 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className={plan.checkColor}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={`mt-7 w-full rounded-full py-3 font-black text-sm ${plan.ctaStyle}`}
                >
                  {plan.cta}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-6 sm:px-12 py-20">
        <h2 className="text-center text-[32px] font-black text-[#1A1A2E]">
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
        <h2 className="text-center text-[32px] font-black text-[#1A1A2E]">
          Questions? We&apos;ve got answers.
        </h2>

        <div className="mt-12 max-w-2xl mx-auto grid gap-3">
          {questions.map((q, i) => (
            <button
              key={q}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              aria-expanded={openFaq === i}
              className="w-full flex items-center justify-between rounded-full border border-gray-200 bg-white px-6 py-4 text-left text-sm font-bold text-gray-800 hover:bg-gray-50"
            >
              {q}
              <span className="text-gray-400">
                {openFaq === i ? "︿" : "﹀"}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-[#9B2335] text-white text-center py-20 px-6">
        <h2 className="text-2xl sm:text-[32px] font-black max-w-lg mx-auto leading-tight">
          Ready to make reading feel like an adventure?
        </h2>

        <Link
          href="#pricing"
          className="mt-7 inline-block rounded-full bg-white text-[#9B2335] font-black px-8 py-3.5 hover:bg-gray-100"
        >
          Start Free Today
        </Link>
        <p className="mt-3 text-xs text-white/80 font-semibold">
          No credit card required
        </p>
      </section>

      {/* Footer */}
      <footer className="px-6 sm:px-12 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <Image
            src="/landing-assets/logo.svg"
            alt="WonderWord AI"
            width={140}
            height={30}
          />
          <p className="text-xs text-gray-400 mt-2">© 2024 WonderWord AI.</p>
        </div>
        <nav className="flex gap-6 text-sm font-bold text-gray-500">
          <a href="#" className="hover:text-[#E8604F]">
            Privacy
          </a>
          <a href="#" className="hover:text-[#E8604F]">
            Terms
          </a>
          <a href="#" className="hover:text-[#E8604F]">
            Support
          </a>
          <a href="#" className="hover:text-[#E8604F]">
            About Us
          </a>
        </nav>
      </footer>
    </main>
  );
}