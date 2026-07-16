import SyllableWord from "@/components/child/SyllableWord";

const syllableMap: Record<string, string[]> = {
  enormous: ["e", "nor", "mous"],
  elephant: ["el", "e", "phant"],
  alligator: ["al", "li", "ga", "tor"],
};

export default function SyllableTestPage() {
  const sentence = [
    "The",
    "enormous",
    "elephant",
    "walked",
    "through",
    "the",
    "tall",
    "green",
    "grass.",
  ];

  return (
    <div className="min-h-screen bg-white flex flex-wrap gap-x-1 gap-y-2 items-center content-start p-8 max-w-md mx-auto">
      {sentence.map((word, i) => {
        const clean = word.toLowerCase().replace(/[.,]/g, "");
        const syllables = syllableMap[clean];
        return syllables ? (
          <SyllableWord key={i} word={word} syllables={syllables} />
        ) : (
          <span key={i} className="text-lg text-gray-800">
            {word}
          </span>
        );
      })}
    </div>
  );
}