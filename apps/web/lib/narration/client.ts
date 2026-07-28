import "server-only";

import {
  mlNarrationResponseSchema,
  type MlNarrationResponse,
  type StoryNarrationErrorCode
} from "@/lib/narration/schema";

const DEFAULT_ML_SERVICE_URL = "http://localhost:8000";
const NARRATION_TIMEOUT_MS = 120_000;

export class StoryNarrationUpstreamError extends Error {
  code: StoryNarrationErrorCode;
  status: number;
  upstreamStatus?: number;

  constructor({
    code,
    message,
    status,
    upstreamStatus
  }: {
    code: StoryNarrationErrorCode;
    message: string;
    status: number;
    upstreamStatus?: number;
  }) {
    super(message);
    this.name = "StoryNarrationUpstreamError";
    this.code = code;
    this.status = status;
    this.upstreamStatus = upstreamStatus;
  }
}

export async function narrateStoryText({
  storyId,
  text
}: {
  storyId: string;
  text: string;
}): Promise<MlNarrationResponse> {
  const baseUrl = process.env.ML_SERVICE_URL || DEFAULT_ML_SERVICE_URL;
  const serviceKey = process.env.ML_SERVICE_KEY;

  if (!serviceKey) {
    throw new StoryNarrationUpstreamError({
      code: "configuration_error",
      message: "Narration service authentication is not configured.",
      status: 500
    });
  }

  const endpoint = `${baseUrl.replace(/\/$/, "")}/narrate`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NARRATION_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": serviceKey
      },
      body: JSON.stringify({
        story_id: storyId,
        text
      }),
      cache: "no-store",
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      console.error("ML narration request timed out.", {
        storyId,
        timeoutMs: NARRATION_TIMEOUT_MS
      });

      throw new StoryNarrationUpstreamError({
        code: "narration_timeout",
        message: "Narration generation timed out.",
        status: 504
      });
    }

    console.error("Failed to connect to ML narration service.", {
      storyId,
      message: error instanceof Error ? error.message : "Unknown connection failure"
    });

    throw new StoryNarrationUpstreamError({
      code: "narration_unavailable",
      message: "Narration service is unavailable.",
      status: 502
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    console.error("ML narration service returned an error status.", {
      storyId,
      upstreamStatus: response.status
    });

    throw new StoryNarrationUpstreamError({
      code: response.status === 503 ? "configuration_error" : "narration_unavailable",
      message:
        response.status === 503
          ? "Narration generation is not configured."
          : "Narration service could not process the story.",
      status: response.status >= 500 ? 502 : 400,
      upstreamStatus: response.status
    });
  }

  const payload = await response.json().catch(() => null);
  const parsedPayload = mlNarrationResponseSchema.safeParse(payload);

  if (!parsedPayload.success) {
    console.error("ML narration response validation failed.", {
      storyId,
      issues: parsedPayload.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });

    throw new StoryNarrationUpstreamError({
      code: "malformed_narration_response",
      message: "Narration service returned a malformed response.",
      status: 502
    });
  }

  return parsedPayload.data;
}
