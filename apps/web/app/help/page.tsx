"use client";

import { useState } from "react";
import {
  Search,
  Folder,
  CreditCard,
  Lock,
  Wrench,
  ChevronDown,
  Zap,
  Send,
  Users,
  ArrowRight,
} from "lucide-react";

// -----------------------------------------------------------------------------
// WonderWord AI — Help & FAQ page
// Next.js App Router page component (app/help/page.tsx)
// Tailwind CSS + lucide-react. Needs "use client" for the FAQ accordion state.
//
// LOGO: uses /public/logo.svg — same file used on the other pages.
// -----------------------------------------------------------------------------

const CATEGORIES = [
  {
    icon: Folder,
    iconBg: "bg-[#fbe0d1]",
    iconColor: "text-[#df7856]",
    title: "Getting Started",
    description: "Learn the basics of AI literacy.",
  },
  {
    icon: CreditCard,
    iconBg: "bg-[#f6ecd1]",
    iconColor: "text-[#a3872a]",
    title: "Billing & Plans",
    description: "Manage subscriptions & payments.",
  },
  {
    icon: Lock,
    iconBg: "bg-[#dbe6f6]",
    iconColor: "text-[#3568b0]",
    title: "Privacy & Safety",
    description: "Your data security is our priority.",
  },
  {
    icon: Wrench,
    iconBg: "bg-[#fbdcdc]",
    iconColor: "text-[#c1523a]",
    title: "Technical Help",
    description: "Troubleshoot apps & devices.",
  },
];

const FAQS = [
  {
    question: "How do I upload a worksheet?",
    answer:
      "From the reading screen, tap the camera icon and snap a photo of the worksheet, or choose a photo from your device's gallery — no app install or special hardware is needed, it works right in your browser. Once uploaded, WonderWord reads the page and lines up the reading activity for your child automatically.",
  },
  {
    question: "Can I delete my child's voice data?",
    answer:
      "Yes. WonderWord follows a zero-retention policy for audio by default: recordings are processed the moment your child reads and are not kept afterward, unless you've explicitly turned on \"Memory Mode.\" If Memory Mode is on, you can delete stored voice data anytime from the Parent Dashboard under Privacy Settings, or by requesting deletion through our support team.",
  },
  {
    question: "How do I upgrade my plan?",
    answer:
      "Head to the Parent Dashboard and open Subscription Settings — you can switch between monthly and annual plans there at any time. Changes to a higher tier apply immediately; downgrades or cancellations take effect at the end of your current billing cycle.",
  },
  {
    question: "Why isn't the microphone working?",
    answer:
      "This is almost always a browser permissions issue. Check that your browser has microphone access enabled for WonderWord (look for a mic icon in the address bar), make sure no other app or tab is already using the microphone, and confirm you're on an up-to-date version of Chrome, Safari, or Edge. If it still doesn't work, try reloading the page — the reading flow only requests microphone access once per session.",
  },
];

export default function HelpFaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-[#FDFAF5] text-[#2b2b2b]">
      {/* ---------------------------------------------------------------- */}
      {/* Header                                                          */}
      {/* ---------------------------------------------------------------- */}
      <header className="border-b border-[#ecdfc9] bg-white">
        <div className="relative mx-auto flex max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] items-center justify-between px-6 py-4">
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

      <main className="mx-auto max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] px-6 py-14">
        {/* -------------------------------------------------------------- */}
        {/* Hero                                                          */}
        {/* -------------------------------------------------------------- */}
        <section className="relative overflow-hidden text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 -z-10 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(239,109,78,0.25),transparent_70%)]"
          />

          <h1 className="font-serif text-4xl font-bold text-[#a3352b] md:text-5xl">
            How can we help?
          </h1>

          <div className="relative mx-auto mt-6 max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a8a8a8]" />
            <input
              type="text"
              placeholder="Search for questions or topics..."
              className="w-full rounded-full border border-[#ecdfc9] bg-white py-3 pl-11 pr-4 text-sm text-[#2b2b2b] placeholder-[#a8a8a8] shadow-sm outline-none focus:border-[#df7856]"
            />
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* Category cards                                                */}
        {/* -------------------------------------------------------------- */}
        <section className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.title}
              className="flex flex-col items-center rounded-2xl border border-[#f0e6d8] bg-white p-6 text-center shadow-sm transition hover:shadow-md"
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full ${cat.iconBg} ${cat.iconColor}`}
              >
                <cat.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-bold leading-snug">{cat.title}</h3>
              <p className="mt-1 text-xs text-[#8a8a8a]">{cat.description}</p>
            </button>
          ))}
        </section>

        {/* -------------------------------------------------------------- */}
        {/* FAQ accordion                                                 */}
        {/* -------------------------------------------------------------- */}
        <section className="mx-auto mt-16 max-w-2xl">
          <h2 className="text-center text-2xl font-bold">
            Frequently Asked Questions
          </h2>

          <div className="mt-6 space-y-3">
            {FAQS.map((faq, i) => {
              const isOpen = openIndex === i;
              return (
                <div
                  key={faq.question}
                  className="rounded-xl border border-[#f0e6d8] bg-white shadow-sm"
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold"
                    aria-expanded={isOpen}
                  >
                    {faq.question}
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-[#a3352b] transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="px-5 pb-4 text-sm leading-relaxed text-[#5a5a5a]">
                      {faq.answer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* Still need help?                                              */}
        {/* -------------------------------------------------------------- */}
        <section className="mt-16 grid grid-cols-1 gap-10 rounded-2xl bg-[#f7e2d7] p-8 md:grid-cols-2 md:p-10">
          <div>
            <h2 className="text-2xl font-bold">Still need help?</h2>
            <p className="mt-3 leading-relaxed text-[#5a4a44]">
              Our support team is here to help you and your little learner.
              Fill out the form or reach us directly at{" "}
              <a
                href="mailto:support@wonderword.ai"
                className="text-[#a3352b] underline"
              >
                support@wonderword.ai
              </a>
              .
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#f9d857] px-4 py-1.5 text-xs font-semibold text-[#5a4a10]">
              <Zap className="h-3.5 w-3.5" />
              Usually within 24hrs
            </div>
          </div>

          <form className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
            <div>
              <label className="text-sm font-semibold text-[#2b2b2b]">
                Email Address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                className="mt-1.5 w-full rounded-lg border border-[#ecdfc9] px-3 py-2 text-sm outline-none focus:border-[#df7856]"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-[#2b2b2b]">
                Subject
              </label>
              <select className="mt-1.5 w-full rounded-lg border border-[#ecdfc9] px-3 py-2 text-sm outline-none focus:border-[#df7856]">
                <option>Technical Issue</option>
                <option>Billing Question</option>
                <option>Privacy & Safety</option>
                <option>Something Else</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-[#2b2b2b]">
                Message
              </label>
              <textarea
                rows={4}
                placeholder="How can we help you today?"
                className="mt-1.5 w-full resize-none rounded-lg border border-[#ecdfc9] px-3 py-2 text-sm outline-none focus:border-[#df7856]"
              />
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#a3352b] py-3 text-sm font-semibold text-white transition hover:bg-[#8c2c23]"
            >
              Send Message
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* Testimonial + side cards                                      */}
        {/* -------------------------------------------------------------- */}
        <section className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-[1.3fr_1fr]">
          <div className="relative flex min-h-[240px] flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br from-[#4a4a4a] to-[#2b2b2b] p-8 text-white">
            <p className="text-lg leading-relaxed">
              &ldquo;WonderWord transformed the way my son looks at reading.
              The support team was incredible when we were setting up his
              custom profile!&rdquo;
            </p>
            <p className="mt-4 text-sm text-white/70">
              — Sarah, Parent &amp; Educator
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-2xl bg-[#fbeceb] p-6">
              <h3 className="font-bold text-[#a3352b]">Weekly Guides</h3>
              <p className="mt-2 text-sm text-[#6b4a45]">
                Check out our latest tips for using AI in early childhood
                literacy.
              </p>
              <a
                href="#"
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#a3352b] hover:underline"
              >
                Explore Guides
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="rounded-2xl bg-[#d6f0e7] p-6">
              <h3 className="font-bold text-[#12695a]">Community Forum</h3>
              <p className="mt-2 text-sm text-[#2f6e63]">
                Join 5,000+ parents discussing literacy and learning tools.
              </p>
              <a
                href="#"
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#12695a] hover:underline"
              >
                Join Community
                <Users className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </section>
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