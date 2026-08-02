import WorksheetDisplay from "@/components/WorksheetDisplay";

const mockWords = [
  { word: "The", start: 0.0, end: 0.4 },
  { word: "small", start: 0.4, end: 0.8 },
  { word: "red", start: 0.8, end: 1.1 },
  { word: "fox", start: 1.1, end: 1.5 },
  { word: "near", start: 1.5, end: 1.9 },
  { word: "a", start: 1.9, end: 2.0 },
  { word: "big", start: 2.0, end: 2.4 },
  { word: "oak", start: 2.4, end: 2.7 },
  { word: "tree", start: 2.7, end: 3.2 },
];

export default function ReadingModeTestPage() {
  return (
    <WorksheetDisplay
      storyName="Story Name"
      text="The small red fox near a big oak tree"
      words={mockWords}
      audioSrc="https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3"
    />
  );
}