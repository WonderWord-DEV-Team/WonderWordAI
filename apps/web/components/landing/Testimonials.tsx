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

export function Testimonials() {
  return (
    <section className="px-6 sm:px-12 py-20">
      <h2 className="text-center text-[32px] font-black text-[#1A1A2E]">Parents Love WonderWord</h2>

      <div className="mt-12 grid sm:grid-cols-3 gap-5 max-w-5xl mx-auto">
        {reviews.map((r) => (
          <div key={r.name} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <p className="text-[#F5A623] text-sm tracking-wide">★★★★★</p>
            <p className="mt-3 text-sm leading-6 italic text-gray-600">&ldquo;{r.quote}&rdquo;</p>
            <div className="mt-5 flex items-center gap-2">
              <span className={`w-8 h-8 rounded-full ${r.avatarColor}`} />
              <p className="text-sm font-bold text-gray-800">{r.name}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}