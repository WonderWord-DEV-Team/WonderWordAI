import "server-only";

import {
  mlPhonicsResponseSchema,
  type MlPhonicsResponse,
  type PhonicsErrorCode
} from "./schema";

const DEFAULT_ML_SERVICE_URL = "http://localhost:8000";

export class PhonicsUpstreamError extends Error {
  code: PhonicsErrorCode;
  status: number;

  constructor(code: PhonicsErrorCode, message: string, status: number) {
    super(message);
    this.name = "PhonicsUpstreamError";
    this.code = code;
    this.status = status;
  }
}

export async function lookupPhonicsRule({
  stuckWord,
  errorDescription
}: {
  stuckWord: string;
  errorDescription?: string;
}): Promise<MlPhonicsResponse> {
  const baseUrl = process.env.ML_SERVICE_URL || DEFAULT_ML_SERVICE_URL;
  const serviceKey = process.env.ML_SERVICE_KEY;

  if (!serviceKey) {
    throw new PhonicsUpstreamError(
      "configuration_error",
      "ML service authentication key is not configured.",
      500
    );
  }

  const endpoint = `${baseUrl}/phonics-lookup`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": serviceKey
      },
      body: JSON.stringify({
        stuck_word: stuckWord,
        error_description: errorDescription || null
      })
    });
  } catch (error) {
    console.error("Failed to connect to ML service for phonics lookup.", error);
    throw new PhonicsUpstreamError(
      "internal_error",
      "Unable to connect to the phonics lookup service.",
      500
    );
  }

  if (response.status === 404) {
    throw new PhonicsUpstreamError(
      "no_rule_found",
      "No matching phonics rule found for this word.",
      404
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new PhonicsUpstreamError(
      "unauthorized",
      "Unauthorized access to phonics lookup service.",
      response.status
    );
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message = errorBody?.detail || "Upstream ML service returned an error.";
    throw new PhonicsUpstreamError(
      "internal_error",
      message,
      response.status
    );
  }

  const data = await response.json().catch(() => null);
  
  const parsed = mlPhonicsResponseSchema.safeParse(data);
  if (!parsed.success) {
    console.error("ML phonics response validation failed.", parsed.error);
    throw new PhonicsUpstreamError(
      "internal_error",
      "Phonics service returned a malformed response.",
      500
    );
  }

  return parsed.data;
}
