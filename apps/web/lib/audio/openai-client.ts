import "server-only";

import {
  alignOpenAiWordsWithReference,
  type OpenAiTranscriptionResponse
} from "@/lib/audio/alignment";
import {
  mlTranscribeResultSchema,
  type MlTranscribeResult
} from "@/lib/audio/schema";
import { AudioTranscriptionError } from "@/lib/audio/client";

const OPENAI_TRANSCRIPTION_ENDPOINT = "https://api.openai.com/v1/audio/transcriptions";
const TRANSCRIPTION_TIMEOUT_MS = 60_000;

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
  formData.append("file", audio, audio.name || "reading-audio.webm");
  formData.append("model", "whisper-1");
  formData.append("language", "en");
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "word");

  if (referenceText?.trim()) {
    formData.append("prompt", referenceText.trim());
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRANSCRIPTION_TIMEOUT_MS);

  let response: Response;

  try {
    console.log("[OpenAI STT] Sending audio to OpenAI Whisper API...");
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

  const parsedPayload = mlTranscribeResultSchema.safeParse(alignedResult);

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
