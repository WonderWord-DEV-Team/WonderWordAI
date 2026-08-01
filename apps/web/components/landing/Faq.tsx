"use client";

import { useState } from "react";

const questions = [
  "Is WonderWord safe for my child?",
  "What grade levels does it support?",
  "How does the AI reading coach work?",
  "Can I cancel my subscription anytime?",
  "Do I need any special equipment?",
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="px-6 sm:px-12 py-20">
      <h2 className="text-center text-[32px] font-black text-[#1A1A2E]">Questions? We&apos;ve got answers.</h2>

      <div className="mt-12 max-w-2xl mx-auto grid gap-3">
        {questions.map((q, i) => (
          <button
            key={q}
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between rounded-full border border-gray-200 bg-white px-6 py-4 text-left text-sm font-bold text-gray-800 hover:bg-gray-50"
          >
            {q}
            <span className="text-gray-400">{openIndex === i ? "︿" : "﹀"}</span>
          </button>
        ))}
      </div>
    </section>
  );
}