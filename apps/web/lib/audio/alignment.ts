import type {
  MlTranscribeResult,
  MlTranscribeReadingEvent,
  MlTranscribeMiscue
} from "@/lib/audio/schema";

export type OpenAiWordTimestamp = {
  word: string;
  start: number;
  end: number;
};

export type OpenAiTranscriptionResponse = {
  text?: string;
  duration?: number;
  words?: OpenAiWordTimestamp[];
};

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9']/g, "");
}

/**
 * Compares words transcribed by OpenAI Whisper against the reference text to
 * construct a structured MlTranscribeResult containing karaoke segments,
 * reading events, and miscue detections.
 */
export function alignOpenAiWordsWithReference({
  openAiResult,
  referenceText
}: {
  openAiResult: OpenAiTranscriptionResponse;
  referenceText?: string;
}): MlTranscribeResult {
  const openAiWords = openAiResult.words ?? [];
  const fullText = (openAiResult.text ?? "").trim() || (referenceText ?? "").trim();
  const totalDuration = openAiResult.duration ?? (openAiWords.length ? openAiWords[openAiWords.length - 1].end : 0);

  // If no reference text is provided, use the transcribed words directly
  const targetWords = referenceText?.trim()
    ? referenceText.trim().split(/\s+/)
    : openAiWords.map((w) => w.word);

  const readingEvents: MlTranscribeReadingEvent[] = [];
  const miscues: MlTranscribeMiscue[] = [];

  // Build a lookup map of transcribed words
  const transcribedNormalized = openAiWords.map((w) => ({
    raw: w.word,
    clean: normalizeWord(w.word),
    start: w.start,
    end: w.end
  }));

  let matchIndex = 0;

  for (let i = 0; i < targetWords.length; i++) {
    const rawTarget = targetWords[i];
    const cleanTarget = normalizeWord(rawTarget);

    if (!cleanTarget) {
      continue;
    }

    // Look for match in transcribed words starting from current matchIndex
    let foundMatch = false;

    for (let j = matchIndex; j < transcribedNormalized.length; j++) {
      if (transcribedNormalized[j].clean === cleanTarget) {
        foundMatch = true;
        matchIndex = j + 1;
        break;
      }
    }

    const isCorrect = foundMatch;

    readingEvents.push({
      word: rawTarget,
      expected_phonemes: cleanTarget,
      actual_phonemes: isCorrect ? cleanTarget : "miscue",
      phonics_category: "general",
      similarity_score: isCorrect ? 1.0 : 0.0,
      confidence: isCorrect ? 1.0 : 0.4,
      is_correct: isCorrect
    });

    if (!isCorrect) {
      // Find closest spoken word around current index for fallback actual_phonemes
      const spokenWord = transcribedNormalized[matchIndex]?.raw ?? "unspoken";

      miscues.push({
        word: rawTarget,
        expected_phonemes: cleanTarget,
        actual_phonemes: normalizeWord(spokenWord) || "miscue",
        phonics_category: "general",
        similarity_score: 0.0,
        confidence: 0.4,
        is_correct: false
      });
    }
  }

  const words = openAiWords.map((w) => w.word);
  const timestamps: number[] = [];
  let lastTimestamp = 0;
  for (const w of openAiWords) {
    const t = Math.max(lastTimestamp, Math.max(0, w.start));
    timestamps.push(t);
    lastTimestamp = t;
  }

  return {
    words,
    timestamps,
    transcript: fullText,
    segments: openAiWords.map((w) => ({
      text: w.word,
      start: w.start,
      end: w.end
    })),
    reading_events: readingEvents,
    miscues
  };
}
