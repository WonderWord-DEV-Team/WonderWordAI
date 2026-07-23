import "server-only";

import {
  mlTranscribeResultSchema,
  type MlTranscribeResult,
  type SessionAudioErrorCode
} from "@/lib/audio/schema";

const DEFAULT_ML_SERVICE_URL = "http://localhost:8000";
const TRANSCRIPTION_TIMEOUT_MS = 30_000;

export class AudioTranscriptionError extends Error {
  code: SessionAudioErrorCode;
  status: number;
  upstreamStatus?: number;

  constructor({
    code,
    message,
    status,
    upstreamStatus
  }: {
    code: SessionAudioErrorCode;
    message: string;
    status: number;
    upstreamStatus?: number;
  }) {
    super(message);
    this.name = "AudioTranscriptionError";
    this.code = code;
    this.status = status;
    this.upstreamStatus = upstreamStatus;
  }
}

export async function transcribeReadingAudio({
  audio
}: {
  audio: File;
}): Promise<MlTranscribeResult> {
  const baseUrl = process.env.ML_SERVICE_URL || DEFAULT_ML_SERVICE_URL;
  const serviceKey = process.env.ML_SERVICE_KEY;

  if (!serviceKey) {
    throw new AudioTranscriptionError({
      code: "ml_configuration_error",
      message: "Transcription service authentication is not configured.",
      status: 500
    });
  }

  const endpoint = `${baseUrl.replace(/\/$/, "")}/transcribe`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRANSCRIPTION_TIMEOUT_MS);
  const body = new FormData();
  body.append("audio", audio, audio.name || "reading-audio");

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "X-Internal-Key": serviceKey
      },
      body,
      cache: "no-store",
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      console.error("ML transcription request timed out.", {
        timeoutMs: TRANSCRIPTION_TIMEOUT_MS
      });

      throw new AudioTranscriptionError({
        code: "transcription_timeout",
        message: "Transcription timed out.",
        status: 504
      });
    }

    console.error("Failed to connect to ML transcription service.", {
      message: error instanceof Error ? error.message : "Unknown connection failure"
    });

    throw new AudioTranscriptionError({
      code: "transcription_unavailable",
      message: "Transcription service is unavailable.",
      status: 502
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    console.error("ML transcription service returned an error status.", {
      upstreamStatus: response.status
    });

    throw new AudioTranscriptionError({
      code: "transcription_unavailable",
      message: "Transcription service could not process the audio.",
      status: response.status >= 500 ? 502 : 400,
      upstreamStatus: response.status
    });
  }

  const payload = await response.json().catch(() => null);
  const parsedPayload = mlTranscribeResultSchema.safeParse(payload);

  if (!parsedPayload.success) {
    console.error("ML transcription response validation failed.", {
      issues: parsedPayload.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });

    throw new AudioTranscriptionError({
      code: "malformed_transcription_response",
      message: "Transcription service returned a malformed response.",
      status: 502
    });
  }

  return parsedPayload.data;
}
