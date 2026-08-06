export function Benefits() {
  return (
    <section className="px-6 sm:px-12 py-20">
      <h2 className="text-center text-[32px] font-black text-[#1A1A2E]">Magic in Every Page</h2>

      <div className="mt-12 grid sm:grid-cols-3 gap-5 max-w-5xl mx-auto">
        <div className="sm:col-span-2 bg-[#F2F2F2] rounded-3xl p-7 relative overflow-hidden min-h-[160px]">
          <span className="inline-block bg-[#FBD6D0] text-[#C4483A] text-[11px] font-black uppercase px-3 py-1 rounded-full">
            Interactive Scanning
          </span>
          <h3 className="mt-4 text-2xl font-black text-[#1A1A2E]">Scan any worksheet</h3>
        </div>

        <div className="bg-[#CFF2E8] rounded-3xl p-7 min-h-[160px]">
          <p className="text-2xl">🎤</p>
          <h3 className="mt-4 font-black text-lg text-[#1A1A2E]">Karaoke Mode</h3>
          <p className="mt-2 text-sm leading-5 text-gray-600">
            Real-time highlighting as your child reads out loud.
          </p>
        </div>

        <div className="bg-[#FBF0C7] rounded-3xl p-7 min-h-[160px]">
          <p className="text-2xl">⭐</p>
          <h3 className="mt-4 font-black text-lg text-[#1A1A2E]">Rewards & Badges</h3>
        </div>

        <div className="sm:col-span-2 bg-[#F2F2F2] rounded-3xl p-7 min-h-[160px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-[#1A1A2E]">Parent Dashboard</h3>
            <p className="mt-2 max-w-sm text-sm leading-5 text-gray-600">
              Weekly progress reports without the &quot;How was school?&quot; struggle. See new words mastered
              and speed improvements at a glance.
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm w-full sm:w-44 flex-shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-500">Weekly Goal</span>
              <span className="font-black text-[#0F9C8E]">85%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-gray-100">
              <div className="h-2 rounded-full bg-[#0F9C8E]" style={{ width: "85%" }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}