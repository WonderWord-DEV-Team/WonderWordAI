import "server-only";

import {
  alignOpenAiWordsWithReference,
  type OpenAiTranscriptionResponse
} from "@/lib/audio/alignment";
import {
  mlTranscribeResultSchema,
  type MlTranscribeResult,
  type MlTranscribeMiscue
} from "@/lib/audio/schema";
import { AudioTranscriptionError } from "@/lib/audio/client";

const OPENAI_TRANSCRIPTION_ENDPOINT = "https://api.openai.com/v1/audio/transcriptions";
const TRANSCRIPTION_TIMEOUT_MS = 60_000;
const MISCUE_TIMEOUT_MS = 120_000;
const DEFAULT_ML_SERVICE_URL = "http://localhost:8000";

// whisper-1 is the only OpenAI transcription model that supports
// response_format=verbose_json + timestamp_granularities=word. The
// gpt-4o-transcribe family rejects verbose_json outright, and without it
// there are no per-word timestamps -- which the karaoke highlighting and
// the words[] array both depend on. So this stays whisper-1.
const OPENAI_TRANSCRIPTION_MODEL = "whisper-1";

/**
 * Asks the ml-service which words in the passage were actually misread.
 *
 * Whisper (and every other LM-backed transcription model) normalizes
 * ambiguous audio toward the word that fits the sentence -- a child reading
 * "dag" in "her dog a bone" comes back transcribed as "dog", so comparing
 * transcript text against the reference finds nothing wrong. Wav2Vec2 on
 * the ml-service is a raw phoneme decoder with no language model, so it
 * hears what was actually pronounced. OpenAI handles transcription +
 * timing (cheap, no RAM on our side); Wav2Vec2 handles miscues.
 *
 * Best-effort by design: if the ml-service is unavailable, transcription
 * still succeeds and we fall back to the text-based alignment rather than
 * failing the whole reading session.
 */
async function fetchPhonemeMiscues({
  audio,
  referenceText
}: {
  audio: File;
  referenceText: string;
}): Promise<MlTranscribeMiscue[] | null> {
  const serviceKey = process.env.ML_SERVICE_KEY;
  if (!serviceKey) {
    console.warn("[miscues] ML_SERVICE_KEY not set; skipping phoneme miscue detection.");
    return null;
  }

  const baseUrl = (process.env.ML_SERVICE_URL || DEFAULT_ML_SERVICE_URL).replace(/\/$/, "");
  const body = new FormData();
  body.append("audio", audio, audio.name || "reading-audio.webm");
  body.append("reference_text", referenceText);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MISCUE_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/detect-word-miscues`, {
      method: "POST",
      headers: { "X-Internal-Key": serviceKey },
      body,
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.warn("[miscues] ml-service returned an error; falling back to text alignment.", {
        status: response.status,
        body: errorBody.slice(0, 300)
      });
      return null;
    }

    const payload = (await response.json().catch(() => null)) as
      | { miscues?: unknown }
      | null;

    if (!payload || !Array.isArray(payload.miscues)) {
      console.warn("[miscues] ml-service returned an unexpected payload; falling back.");
      return null;
    }

    const miscues = payload.miscues
      .map((raw): MlTranscribeMiscue | null => {
        const entry = raw as Record<string, unknown>;
        const word = typeof entry.word === "string" ? entry.word.trim() : "";
        if (!word) {
          return null;
        }

        return {
          word,
          expected_phonemes: typeof entry.expected_phonemes === "string" ? entry.expected_phonemes : "",
          actual_phonemes: typeof entry.actual_phonemes === "string" ? entry.actual_phonemes : "",
          phonics_category: "general",
          similarity_score:
            typeof entry.similarity_score === "number"
              ? Math.min(Math.max(entry.similarity_score, 0), 1)
              : undefined,
          is_correct: false
        };
      })
      .filter((entry): entry is MlTranscribeMiscue => entry !== null);

    console.log("[miscues] phoneme-based miscue count:", miscues.length);
    return miscues;
  } catch (error) {
    console.warn("[miscues] Could not reach ml-service; falling back to text alignment.", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function transcribeReadingAudioWithOpenAI({
  audio,
  referenceText
}: {
  audio: File;
  referenceText?: string;
}): Promise<MlTranscribeResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new AudioTranscriptionError({
      code: "ml_configuration_error",
      message: "OPENAI_API_KEY is not configured on the server.",
      status: 500
    });
  }

  const formData = new FormData();
  let filename = audio.name || "reading-audio.webm";
  if (!filename.includes(".")) {
    const ext = audio.type ? audio.type.split(";")[0].split("/")[1] : "webm";
    filename = `${filename}.${ext || "webm"}`;
  }
  formData.append("file", audio, filename);
  formData.append("model", OPENAI_TRANSCRIPTION_MODEL);
  formData.append("language", "en");
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "word");

  // Deliberately no `prompt` param: handing Whisper the expected sentence
  // biases it toward transcribing that sentence instead of what was said,
  // which compounds the normalization problem fetchPhonemeMiscues() exists
  // to work around.

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRANSCRIPTION_TIMEOUT_MS);

  // Miscue detection only needs the audio + reference text, so it runs in
  // parallel with transcription instead of adding its latency on top.
  const miscuePromise = referenceText?.trim()
    ? fetchPhonemeMiscues({ audio, referenceText: referenceText.trim() })
    : Promise.resolve(null);

  let response: Response;

  try {
    console.log("[OpenAI STT] Sending audio to OpenAI Whisper API...", { filename, type: audio.type });
    response = await fetch(OPENAI_TRANSCRIPTION_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: formData,
      cache: "no-store",
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      console.error("[OpenAI STT] Request timed out.");
      throw new AudioTranscriptionError({
        code: "transcription_timeout",
        message: "OpenAI transcription timed out.",
        status: 504
      });
    }

    console.error("[OpenAI STT] Connection error:", error);
    throw new AudioTranscriptionError({
      code: "transcription_unavailable",
      message: "Failed to connect to OpenAI transcription service.",
      status: 502
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.error("[OpenAI STT] OpenAI API returned error status:", response.status, errorBody);

    throw new AudioTranscriptionError({
      code: "transcription_unavailable",
      message: `OpenAI STT error (${response.status}): ${errorBody || response.statusText}`,
      status: response.status >= 500 ? 502 : 400,
      upstreamStatus: response.status
    });
  }

  const rawJson = (await response.json().catch(() => null)) as OpenAiTranscriptionResponse | null;

  if (!rawJson) {
    throw new AudioTranscriptionError({
      code: "malformed_transcription_response",
      message: "Empty or malformed JSON returned from OpenAI STT.",
      status: 502
    });
  }

  console.log(
    "[OpenAI STT] Received response, word count:",
    rawJson.words?.length ?? 0
  );

  const alignedResult = alignOpenAiWordsWithReference({
    openAiResult: rawJson,
    referenceText
  });

  // Prefer the phoneme-based miscues when the ml-service answered. The
  // text-based miscues from alignOpenAiWordsWithReference stay as the
  // fallback -- they still catch gross errors (skipped/inserted words),
  // they just can't see substitutions Whisper already normalized away.
  const phonemeMiscues = await miscuePromise;
  const resultWithMiscues: MlTranscribeResult = phonemeMiscues
    ? { ...alignedResult, miscues: phonemeMiscues }
    : alignedResult;

  const parsedPayload = mlTranscribeResultSchema.safeParse(resultWithMiscues);

  if (!parsedPayload.success) {
    console.error("[OpenAI STT] Validation failed for aligned payload:", parsedPayload.error);
    throw new AudioTranscriptionError({
      code: "malformed_transcription_response",
      message: "Aligned transcription result schema validation failed.",
      status: 502
    });
  }

  return parsedPayload.data;
}