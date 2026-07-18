import PhonicsTabContent from "@/components/child/PhonicsTabContent";

export default function PhonicsSpeechTestPage() {
  const phonemes = [
    { text: "e", type: "vowel" as const },
    { text: "n", type: "consonant" as const },
    { text: "or", type: "vowel" as const },
    { text: "m", type: "consonant" as const },
    { text: "ous", type: "vowel" as const },
  ];

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="w-full max-w-md bg-white rounded-[20px] shadow-lg p-5">
        <PhonicsTabContent word="enormous" phonemes={phonemes} />
      </div>
    </div>
  );
}