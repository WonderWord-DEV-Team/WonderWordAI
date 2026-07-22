"use client";
import PracticeTabContent from "@/components/child/PracticeTabContent";

export default function PracticeTabTestPage() {
  // Simulates the /detect-miscue response, alternating correct/incorrect for testing
  let callCount = 0;

  const mockRecordComplete = async () => {
    callCount++;
    await new Promise((resolve) => setTimeout(resolve, 800)); // simulate network delay

    return callCount % 2 === 0
      ? { phonemes: ["k", "æ", "t"], similarity: 0.42, confidence: false }
      : { phonemes: ["k", "æ", "t"], similarity: 0.8542, confidence: true };
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="w-full max-w-md bg-white rounded-[20px] shadow-lg p-5">
        <PracticeTabContent word="cat" onRecordComplete={mockRecordComplete} />
      </div>
    </div>
  );
}