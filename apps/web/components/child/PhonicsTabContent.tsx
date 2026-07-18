"use client";

type Phoneme = {
  text: string;
  type: "vowel" | "consonant";
};

type PhonicsTabContentProps = {
  word: string;
  phonemes: Phoneme[];
};

export default function PhonicsTabContent({ word, phonemes }: PhonicsTabContentProps) {
  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8; // slightly slower, better for kids learning phonics
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">
            Practice word
          </p>
          <p className="text-2xl font-bold text-gray-900">{word}</p>
        </div>
        <button
          aria-label={`Play pronunciation of ${word}`}
          onClick={() => speak(word)}
          className="w-12 h-12 min-h-[48px] bg-[#E6F5F6] rounded-full flex items-center justify-center text-[#008C9A]"
        >
          🔊
        </button>
      </div>

      <p className="text-xs text-gray-400 uppercase tracking-wide text-center">
        Tap each sound to hear it
      </p>

      <div className="flex justify-center gap-3 flex-wrap">
        {phonemes.map((p, i) => (
          <button
            key={i}
            onClick={() => speak(p.text)}
            aria-label={`Play sound: ${p.text}`}
            className={`px-4 py-3 rounded-xl text-white text-lg font-semibold min-h-[48px] min-w-[48px] active:scale-95 transition ${
              p.type === "vowel" ? "bg-red-500" : "bg-blue-400"
            }`}
          >
            {p.text}
          </button>
        ))}
      </div>
    </div>
  );
}