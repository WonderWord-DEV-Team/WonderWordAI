import ListenTabContent from "@/components/child/ListenTabContent";

const mockWords = [
  { word: "The", start: 0.0, end: 0.4 },
  { word: "enormous", start: 0.4, end: 1.2 },
  { word: "elephant", start: 1.2, end: 2.0 },
  { word: "walked", start: 2.0, end: 2.6 },
  { word: "through", start: 2.6, end: 3.2 },
  { word: "the", start: 3.2, end: 3.5 },
  { word: "tall", start: 3.5, end: 4.0 },
  { word: "green", start: 4.0, end: 4.5 },
  { word: "grass.", start: 4.5, end: 5.2 },
];

export default function ListenTabTestPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="w-full max-w-md bg-white rounded-[20px] shadow-lg p-5">
        <ListenTabContent
          words={mockWords}
          audioSrc="https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3"
        />
      </div>
    </div>
  );
}