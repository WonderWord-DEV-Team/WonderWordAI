"use client";

import { useEffect, useState } from "react";

type BadgeAwardProps = {
  show: boolean;
  onDismiss?: () => void;
};

export default function BadgeAward({ show, onDismiss }: BadgeAwardProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onDismiss]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 animate-[fadeIn_0.2s_ease-out]">
      <div className="relative bg-white rounded-3xl px-8 py-10 flex flex-col items-center gap-3 shadow-2xl animate-[popIn_0.4s_cubic-bezier(0.34,1.56,0.64,1)]">
        {/* Confetti-ish dots */}
        <div className="absolute -top-3 left-6 w-3 h-3 rounded-full bg-[#F5A623] animate-[bounce_1s_infinite]" />
        <div className="absolute -top-4 right-10 w-2 h-2 rounded-full bg-[#0F9C8E] animate-[bounce_1.2s_infinite]" />
        <div className="absolute -top-2 right-1/3 w-2.5 h-2.5 rounded-full bg-[#E8604F] animate-[bounce_0.9s_infinite]" />

        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#F5A623] to-[#E8604F] flex items-center justify-center text-5xl animate-[spin_0.6s_ease-out]">
          🏅
        </div>
        <p className="text-2xl font-black text-[#1A1A2E]">Great job!</p>
        <p className="text-sm text-gray-500 text-center max-w-[200px]">
          You earned a new badge for excellent reading!
        </p>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}