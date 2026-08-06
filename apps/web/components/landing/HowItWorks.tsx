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

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 sm:px-12 py-20">
      <h2 className="text-center text-[32px] font-black text-[#1A1A2E]">How It Works</h2>
      <p className="mt-2 text-center text-[15px] text-gray-500">3 simple steps — no tech skills needed</p>

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
              <p className="mt-2 text-sm leading-5 text-gray-500 max-w-[220px] mx-auto">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}