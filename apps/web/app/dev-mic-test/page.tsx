"use client";

import { useState } from "react";
import MicButton from "@/components/MicButton";

export default function MicTestPage() {
  const [isRecording, setIsRecording] = useState(false);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <MicButton isRecording={isRecording} onToggle={() => setIsRecording(!isRecording)} />
    </div>
  );
}