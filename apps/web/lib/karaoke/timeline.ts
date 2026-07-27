import type { SessionAudioData, SessionAudioWord } from "../audio/schema";

export type KaraokeWordStatus = "pending" | "active" | "completed" | "unmatched";

export type WorksheetToken = {
  id: string;
  text: string;
  normalizedWord: string;
  worksheetIndex: number;
};

export type WorksheetTextPart =
  | {
      type: "word";
      id: string;
      text: string;
      normalizedWord: string;
      worksheetIndex: number;
    }
  | {
      type: "separator";
      id: string;
      text: string;
    };

export type KaraokeWord = {
  id: string;
  word: string;
  normalizedWord: string;
  start: number;
  end: number;
  transcriptIndex: number;
  worksheetIndex: number | null;
  status: KaraokeWordStatus;
};

export type KaraokeTimeline = {
  worksheetParts: WorksheetTextPart[];
  worksheetTokens: WorksheetToken[];
  words: KaraokeWord[];
  skippedWorksheetIndexes: number[];
};

type AlignmentStep =
  | { type: "match"; transcriptIndex: number; worksheetIndex: number }
  | { type: "substitute"; transcriptIndex: number; worksheetIndex: number }
  | { type: "extra"; transcriptIndex: number }
  | { type: "skip"; worksheetIndex: number };

export const RECORDING_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
  "audio/wav"
];

const WORD_PATTERN = /[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)*/g;
const FALLBACK_WORD_SECONDS = 0.45;
const MAX_FALLBACK_WORD_SECONDS = 0.9;

const CONTRACTION_EQUIVALENTS = new Map<string, string>([
  ["isnt", "is not"],
  ["arent", "are not"],
  ["wasnt", "was not"],
  ["werent", "were not"],
  ["dont", "do not"],
  ["doesnt", "does not"],
  ["didnt", "did not"],
  ["cant", "can not"],
  ["cannot", "can not"],
  ["wont", "will not"],
  ["im", "i am"],
  ["ive", "i have"],
  ["ill", "i will"],
  ["theyre", "they are"],
  ["youre", "you are"],
  ["thats", "that is"]
]);

export function normalizeKaraokeWord(word: string) {
  const compact = word
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^a-z0-9']/g, "")
    .replace(/'/g, "");

  return CONTRACTION_EQUIVALENTS.get(compact) ?? compact;
}

export function tokenizeWorksheetText(text: string): {
  parts: WorksheetTextPart[];
  tokens: WorksheetToken[];
} {
  const parts: WorksheetTextPart[] = [];
  const tokens: WorksheetToken[] = [];
  let cursor = 0;
  let worksheetIndex = 0;
  let partIndex = 0;

  WORD_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = WORD_PATTERN.exec(text)) !== null) {
    const rawWord = match[0];
    const startIndex = match.index;

    if (startIndex > cursor) {
      parts.push({
        type: "separator",
        id: `separator-${partIndex}`,
        text: text.slice(cursor, startIndex)
      });
      partIndex += 1;
    }

    const token: WorksheetToken = {
      id: `worksheet-word-${worksheetIndex}`,
      text: rawWord,
      normalizedWord: normalizeKaraokeWord(rawWord),
      worksheetIndex
    };

    tokens.push(token);
    parts.push({
      type: "word",
      ...token
    });

    worksheetIndex += 1;
    partIndex += 1;
    cursor = startIndex + rawWord.length;
  }

  if (cursor < text.length) {
    parts.push({
      type: "separator",
      id: `separator-${partIndex}`,
      text: text.slice(cursor)
    });
  }

  return { parts, tokens };
}

export function buildKaraokeTimeline({
  worksheetText,
  audio
}: {
  worksheetText: string;
  audio: Pick<SessionAudioData, "words">;
}): KaraokeTimeline {
  const { parts, tokens } = tokenizeWorksheetText(worksheetText);
  const timestampedWords = normalizeTimestampedWords(audio.words);
  const alignment = alignTranscriptToWorksheet({
    transcriptWords: timestampedWords.map((word) => word.word),
    worksheetTokens: tokens
  });
  const worksheetByTranscriptIndex = new Map<number, number | null>();
  const skippedWorksheetIndexes = new Set<number>();

  for (const step of alignment) {
    if (step.type === "match") {
      worksheetByTranscriptIndex.set(step.transcriptIndex, step.worksheetIndex);
    } else if (step.type === "extra") {
      worksheetByTranscriptIndex.set(step.transcriptIndex, null);
    } else if (step.type === "substitute") {
      worksheetByTranscriptIndex.set(step.transcriptIndex, null);
      skippedWorksheetIndexes.add(step.worksheetIndex);
    } else {
      skippedWorksheetIndexes.add(step.worksheetIndex);
    }
  }

  return {
    worksheetParts: parts,
    worksheetTokens: tokens,
    words: timestampedWords.map((word) => {
      const worksheetIndex = worksheetByTranscriptIndex.get(word.transcriptIndex) ?? null;

      return {
        id: `karaoke-word-${word.transcriptIndex}`,
        word: word.word,
        normalizedWord: normalizeKaraokeWord(word.word),
        start: word.start,
        end: word.end,
        transcriptIndex: word.transcriptIndex,
        worksheetIndex,
        status: worksheetIndex === null ? "unmatched" : "pending"
      };
    }),
    skippedWorksheetIndexes: Array.from(skippedWorksheetIndexes).sort((a, b) => a - b)
  };
}

export function alignTranscriptToWorksheet({
  transcriptWords,
  worksheetTokens
}: {
  transcriptWords: string[];
  worksheetTokens: WorksheetToken[];
}): AlignmentStep[] {
  const transcript = transcriptWords.map(normalizeKaraokeWord);
  const worksheet = worksheetTokens.map((token) => token.normalizedWord);
  const rows = transcript.length + 1;
  const cols = worksheet.length + 1;
  const scores: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
  const actions: Array<Array<AlignmentStep["type"] | null>> = Array.from({ length: rows }, () =>
    Array(cols).fill(null)
  );

  for (let i = 1; i < rows; i += 1) {
    scores[i][0] = i;
    actions[i][0] = "extra";
  }

  for (let j = 1; j < cols; j += 1) {
    scores[0][j] = j;
    actions[0][j] = "skip";
  }

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const matching = wordsEquivalent(transcript[i - 1], worksheet[j - 1]);
      const diagonalCost = matching ? 0 : 1.45;
      const candidates = [
        {
          score: scores[i - 1][j - 1] + diagonalCost,
          action: matching ? ("match" as const) : ("substitute" as const)
        },
        { score: scores[i - 1][j] + 1, action: "extra" as const },
        { score: scores[i][j - 1] + 1, action: "skip" as const }
      ];
      const best = candidates.sort((a, b) => a.score - b.score)[0];

      scores[i][j] = best.score;
      actions[i][j] = best.action;
    }
  }

  const steps: AlignmentStep[] = [];
  let i = transcript.length;
  let j = worksheet.length;

  while (i > 0 || j > 0) {
    const action = actions[i][j];

    if (action === "match" || action === "substitute") {
      steps.push({
        type: action,
        transcriptIndex: i - 1,
        worksheetIndex: j - 1
      });
      i -= 1;
      j -= 1;
    } else if (action === "extra") {
      steps.push({ type: "extra", transcriptIndex: i - 1 });
      i -= 1;
    } else {
      steps.push({ type: "skip", worksheetIndex: j - 1 });
      j -= 1;
    }
  }

  return steps.reverse();
}

export function getActiveKaraokeIndex(words: KaraokeWord[], currentTime: number) {
  if (!Number.isFinite(currentTime) || currentTime < 0) {
    return -1;
  }

  let activeIndex = -1;

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];

    if (currentTime < word.start) {
      break;
    }

    if (currentTime >= word.start && currentTime <= word.end) {
      activeIndex = index;
    }
  }

  return activeIndex;
}

export function getKaraokeWordStatus({
  word,
  wordIndex,
  activeIndex,
  currentTime,
  playbackCompleted
}: {
  word: KaraokeWord;
  wordIndex: number;
  activeIndex: number;
  currentTime: number;
  playbackCompleted: boolean;
}): KaraokeWordStatus {
  if (word.worksheetIndex === null) {
    return "unmatched";
  }

  if (
    playbackCompleted ||
    currentTime >= word.end ||
    (activeIndex > -1 && wordIndex < activeIndex)
  ) {
    return "completed";
  }

  if (wordIndex === activeIndex) {
    return "active";
  }

  return "pending";
}

export function chooseSupportedRecordingMimeType({
  isTypeSupported,
  candidates = RECORDING_MIME_CANDIDATES
}: {
  isTypeSupported?: (type: string) => boolean;
  candidates?: string[];
} = {}) {
  if (!isTypeSupported) {
    return "";
  }

  return candidates.find((type) => {
    try {
      return isTypeSupported(type);
    } catch {
      return false;
    }
  }) ?? "";
}

export function stopMediaStreamTracks(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((track) => track.stop());
}

function normalizeTimestampedWords(words: SessionAudioWord[]) {
  const validWords = words
    .map((word, transcriptIndex) => ({
      word: word.word.trim(),
      start: word.start,
      end: word.end,
      transcriptIndex
    }))
    .filter(
      (word) =>
        word.word.length > 0 &&
        Number.isFinite(word.start) &&
        word.start >= 0 &&
        (word.end === null || (Number.isFinite(word.end) && word.end >= word.start))
    )
    .sort((a, b) => a.start - b.start || a.transcriptIndex - b.transcriptIndex);

  return validWords.map((word, index) => {
    const nextStart = validWords[index + 1]?.start;
    const fallbackEnd =
      typeof nextStart === "number" && nextStart > word.start
        ? nextStart
        : word.start + FALLBACK_WORD_SECONDS;
    const boundedFallbackEnd = Math.min(fallbackEnd, word.start + MAX_FALLBACK_WORD_SECONDS);

    return {
      ...word,
      end: word.end ?? boundedFallbackEnd
    };
  });
}

function wordsEquivalent(left: string, right: string) {
  if (left === right) {
    return true;
  }

  return CONTRACTION_EQUIVALENTS.get(left) === right || CONTRACTION_EQUIVALENTS.get(right) === left;
}
