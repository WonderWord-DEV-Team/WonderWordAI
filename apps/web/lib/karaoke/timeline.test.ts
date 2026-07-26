import assert from "node:assert/strict";
import {
  buildKaraokeTimeline,
  chooseSupportedRecordingMimeType,
  getActiveKaraokeIndex,
  getKaraokeWordStatus,
  normalizeKaraokeWord,
  tokenizeWorksheetText,
  type KaraokeWord
} from "./timeline";

const worksheet = "The cat is in the tree. The cat can jump.";

const skippedTimeline = buildKaraokeTimeline({
  worksheetText: worksheet,
  audio: {
    words: [
      { word: "The", start: 0, end: 0.2 },
      { word: "cat", start: 0.3, end: 0.5 },
      { word: "is", start: 0.6, end: 0.8 },
      { word: "in", start: 0.9, end: 1.1 },
      { word: "tree", start: 1.2, end: 1.4 },
      { word: "The", start: 1.6, end: 1.8 },
      { word: "cat", start: 1.9, end: 2.1 },
      { word: "can", start: 2.2, end: 2.4 },
      { word: "jump", start: 2.5, end: 2.7 }
    ]
  }
});

assert.deepEqual(
  skippedTimeline.words.map((word) => word.worksheetIndex),
  [0, 1, 2, 3, 5, 6, 7, 8, 9],
  "skipped words must not shift later repeated words backward"
);
assert.deepEqual(skippedTimeline.skippedWorksheetIndexes, [4]);

assert.equal(normalizeKaraokeWord("bird,"), "bird");
assert.equal(normalizeKaraokeWord("The"), "the");
assert.equal(normalizeKaraokeWord("isn't"), "is not");

const punctuationTimeline = buildKaraokeTimeline({
  worksheetText: "A bird, can sing.",
  audio: {
    words: [
      { word: "a", start: 0, end: 0.1 },
      { word: "bird", start: 0.2, end: 0.4 },
      { word: "can", start: 0.5, end: 0.7 },
      { word: "sing", start: 0.8, end: 1 }
    ]
  }
});
assert.deepEqual(
  punctuationTimeline.words.map((word) => word.worksheetIndex),
  [0, 1, 2, 3],
  "punctuation should not prevent alignment"
);

const extraTimeline = buildKaraokeTimeline({
  worksheetText: "The cat sat.",
  audio: {
    words: [
      { word: "The", start: 0, end: 0.2 },
      { word: "big", start: 0.25, end: 0.45 },
      { word: "cat", start: 0.5, end: 0.7 },
      { word: "sat", start: 0.8, end: 1 }
    ]
  }
});
assert.deepEqual(
  extraTimeline.words.map((word) => word.worksheetIndex),
  [0, null, 1, 2],
  "extra spoken words should remain unmatched without breaking order"
);

const malformedTimeline = buildKaraokeTimeline({
  worksheetText: "one two three",
  audio: {
    words: [
      { word: "three", start: 1.2, end: 1.4 },
      { word: "bad", start: -1, end: 0.1 },
      { word: "one", start: 0, end: null },
      { word: "two", start: 0.4, end: 0.9 },
      { word: "overlap", start: 0.7, end: 1.1 }
    ]
  }
});
assert.deepEqual(
  malformedTimeline.words.map((word) => word.word),
  ["one", "two", "overlap", "three"],
  "negative timestamps should be filtered and valid words sorted"
);
assert.equal(malformedTimeline.words[0].end, 0.4);

assert.equal(getActiveKaraokeIndex(malformedTimeline.words, 0.75), 2);
assert.equal(getActiveKaraokeIndex(malformedTimeline.words, -0.1), -1);

const statusWord: KaraokeWord = {
  id: "karaoke-word-0",
  word: "one",
  normalizedWord: "one",
  start: 0,
  end: 0.4,
  transcriptIndex: 0,
  worksheetIndex: 0,
  status: "pending"
};
assert.equal(
  getKaraokeWordStatus({
    word: statusWord,
    wordIndex: 0,
    activeIndex: -1,
    currentTime: 2,
    playbackCompleted: true
  }),
  "completed"
);

assert.equal(
  chooseSupportedRecordingMimeType({
    isTypeSupported: (type) => type === "audio/mp4"
  }),
  "audio/mp4"
);
assert.equal(
  chooseSupportedRecordingMimeType({
    isTypeSupported: () => false
  }),
  ""
);

const tokenized = tokenizeWorksheetText("Line one.\nLine two.");
assert.equal(tokenized.parts.some((part) => part.type === "separator" && part.text.includes("\n")), true);

console.log("karaoke timeline tests passed");
