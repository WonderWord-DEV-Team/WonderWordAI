type MascotBubbleProps = {
  quote: string;
  caption: string;
};

export default function MascotBubble({ quote, caption }: MascotBubbleProps) {
  return (
    <div className="mb-8 flex items-start gap-4">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#e9f4f1]">
        <span className="text-3xl" role="img" aria-label="WonderWord mascot">
          🦉
        </span>
      </div>
      <div className="rounded-2xl border border-[#f0e6d8] bg-[#fdfaf5] p-4">
        <p className="font-medium text-[#2b2b2b]">&ldquo;{quote}&rdquo;</p>
        <p className="mt-1 text-sm text-[#8a8a8a]">{caption}</p>
      </div>
    </div>
  );
}