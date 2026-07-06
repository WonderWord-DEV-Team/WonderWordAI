type WorksheetDisplayProps = {
  text: string;
};

export default function WorksheetDisplay({ text }: WorksheetDisplayProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-between p-6">
      <div className="w-full max-w-md bg-[#FAFAFA] rounded-2xl p-6 mt-8">
        <p className="text-lg leading-relaxed text-gray-800">
          {text}
        </p>
      </div>

      <button
        aria-label="Start recording"
        className="w-[60px] h-[60px] rounded-full bg-red-500 flex items-center justify-center mb-10 mt-8 active:scale-95 transition"
      >
        <MicIcon />
      </button>
    </div>
  );
}

function MicIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="white"
      className="w-7 h-7"
    >
      <path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z" />
      <path d="M19 11a1 1 0 00-2 0 5 5 0 01-10 0 1 1 0 00-2 0 7 7 0 006 6.92V20H9a1 1 0 000 2h6a1 1 0 000-2h-2v-2.08A7 7 0 0019 11z" />
    </svg>
  );
}