export function Hero() {
  return (
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
            <a
              href="#pricing"
              className="rounded-full bg-[#E8604F] px-7 py-3.5 text-white font-black text-[15px] hover:bg-[#d9543f]"
            >
              Start Free Trial
            </a>
            <a
              href="/auth/login"
              className="rounded-full bg-[#B9EFE0] px-7 py-3.5 text-gray-800 font-black text-[15px] hover:bg-[#a5e8d5]"
            >
              Log In
            </a>
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
  );
}