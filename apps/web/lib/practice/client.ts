import "server-only";

import {
  mlPronunciationResponseSchema,
  type MlPronunciationResponse,
  type PracticeErrorCode
} from "./schema";

const DEFAULT_ML_SERVICE_URL = "http://localhost:8000";

export class PracticeUpstreamError extends Error {
  code: PracticeErrorCode;
  status: number;

  constructor(code: PracticeErrorCode, message: string, status: number) {
    super(message);
    this.name = "PracticeUpstreamError";
    this.code = code;
    this.status = status;
  }
}

// Reuses the ml-service's existing /detect-miscue endpoint (see
// apps/ml-service/routers/detect_miscue.py) rather than the full
// /api/sessions/[id]/audio pipeline -- that route is tied to an open
// reading_sessions row and persists reading_events, neither of which
// makes sense for a quick single-word practice check inside the
// correction modal. /detect-miscue only ever needed `audio` +
// `reference_text`, which is exactly this shape: reference_text is just
// the target word instead of a full passage.
export async function checkPronunciation({
  audio,
  word
}: {
  audio: File;
  word: string;
}): Promise<MlPronunciationResponse> {
  const baseUrl = process.env.ML_SERVICE_URL || DEFAULT_ML_SERVICE_URL;
  const serviceKey = process.env.ML_SERVICE_KEY;

  if (!serviceKey) {
    throw new PracticeUpstreamError(
      "configuration_error",
      "ML service authentication key is not configured.",
      500
    );
  }

  const endpoint = `${baseUrl}/detect-miscue`;

  const upstreamForm = new FormData();
  upstreamForm.set("audio", audio, audio.name || "practice-attempt.webm");
  upstreamForm.set("reference_text", word);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "X-Internal-Key": serviceKey
      },
      body: upstreamForm
    });
  } catch (error) {
    console.error("Failed to connect to ML service for pronunciation check.", error);
    throw new PracticeUpstreamError(
      "internal_error",
      "Unable to connect to the pronunciation check service.",
      500
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new PracticeUpstreamError(
      "unauthorized",
      "Unauthorized access to pronunciation check service.",
      response.status
    );
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message = errorBody?.detail || "Upstream ML service returned an error.";
    throw new PracticeUpstreamError(
      "internal_error",
      message,
      response.status
    );
  }

  const data = await response.json().catch(() => null);

  const parsed = mlPronunciationResponseSchema.safeParse(data);
  if (!parsed.success) {
    console.error("ML pronunciation response validation failed.", parsed.error);
    throw new PracticeUpstreamError(
      "internal_error",
      "Pronunciation check service returned a malformed response.",
      500
    );
  }

  return parsed.data;
}