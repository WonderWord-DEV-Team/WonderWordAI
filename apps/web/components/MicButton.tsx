"use client";

type MicButtonProps = {
  isRecording?: boolean;
  onToggle?: () => void;
};

export default function MicButton({ isRecording = false, onToggle }: MicButtonProps) {
  return (
    <button
      aria-label={isRecording ? "Stop recording" : "Start recording"}
      onClick={onToggle}
      className="relative w-[60px] h-[60px] flex items-center justify-center"
    >
      {isRecording && (
        <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
      )}
      <span
        className={`relative inline-flex rounded-full w-[60px] h-[60px] items-center justify-center transition
          ${isRecording ? "bg-red-600 scale-105" : "bg-red-500"}
          active:scale-95`}
      >
        <MicIcon />
      </span>
    </button>
  );
}

function MicIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-7 h-7">
      <path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z" />
      <path d="M19 11a1 1 0 00-2 0 5 5 0 01-10 0 1 1 0 00-2 0 7 7 0 006 6.92V20H9a1 1 0 000 2h6a1 1 0 000-2h-2v-2.08A7 7 0 0019 11z" />
    </svg>
  );
}