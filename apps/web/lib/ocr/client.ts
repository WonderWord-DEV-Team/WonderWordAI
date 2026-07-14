import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import {
  parseOcrModelResponse,
  type AllowedImageType,
  type OcrErrorCode,
  type OcrModelResponse
} from "@/lib/ocr/schema";

const OCR_MODEL = "claude-haiku-4-5-20251001";
const OCR_TIMEOUT_MS = 45_000;

const OCR_PROMPT = `You are an OCR engine.

Extract all visible text exactly as it appears.

Rules:
- Preserve every visible character exactly as it appears, including spelling, punctuation, capitalization, singular/plural forms, numbering, spacing, and line breaks.
- Never correct, rewrite, paraphrase, infer, or complete missing text.
- Never modify multiple-choice questions or answers.
- If text is unreadable, replace only that part with "[unclear]".
- Ignore decorations and illustrations unless they contain text.

After extraction, generate up to 7 image keywords.

Keyword rules:
- Use only concepts explicitly mentioned in the text.
- Choose visual concepts useful for image generation.
- Prefer people, objects, animals, places, actions, and colors.
- Keep keywords to 1-3 words.

Good: birthday party, red balloon, pig, farm, school bus
Bad: worksheet, reading comprehension, education, exercise, question

Return ONLY this JSON:

{
  "text": "...",
  "image_keywords": ["keyword1", "keyword2"]
}`;

export class OcrMalformedResponseError extends Error {
  constructor(message = "Claude returned malformed OCR JSON.") {
    super(message);
    this.name = "OcrMalformedResponseError";
  }
}

export type StableOcrUpstreamError = {
  code: OcrErrorCode;
  message: string;
  status: number;
};

export async function extractWorksheetText({
  apiKey,
  base64Image,
  mediaType
}: {
  apiKey: string;
  base64Image: string;
  mediaType: AllowedImageType;
}): Promise<OcrModelResponse> {
  const anthropic = new Anthropic({
    apiKey,
    timeout: OCR_TIMEOUT_MS,
    maxRetries: 0
  });

  const response = await anthropic.messages.create(
    {
      model: OCR_MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Image
              }
            },
            {
              type: "text",
              text: OCR_PROMPT
            }
          ]
        }
      ]
    },
    {
      timeout: OCR_TIMEOUT_MS,
      maxRetries: 0,
      signal: AbortSignal.timeout(OCR_TIMEOUT_MS)
    }
  );

  const textBlock = response.content.find((block) => block.type === "text");

  if (!textBlock || textBlock.type !== "text") {
    throw new OcrMalformedResponseError("Claude did not return a text content block.");
  }

  const parsed = parseOcrModelResponse(textBlock.text);

  if (!parsed.success) {
    throw new OcrMalformedResponseError("Claude OCR JSON failed validation.");
  }

  return parsed.data;
}

export function mapOcrUpstreamError(error: unknown): StableOcrUpstreamError {
  if (error instanceof OcrMalformedResponseError) {
    return {
      code: "ocr_malformed_response",
      message: "We could not read that worksheet response. Please try again.",
      status: 502
    };
  }

  if (error instanceof Anthropic.APIConnectionTimeoutError || isAbortError(error)) {
    return {
      code: "ocr_timeout",
      message: "The worksheet scan took too long. Please try again.",
      status: 504
    };
  }

  if (error instanceof Anthropic.APIError) {
    if (error.status === 401 || error.status === 403 || error.type === "authentication_error") {
      return {
        code: "ocr_authentication_error",
        message: "Worksheet scanning is not configured correctly.",
        status: 502
      };
    }

    if (error.status === 429 || error.type === "rate_limit_error") {
      return {
        code: "ocr_rate_limited",
        message: "Worksheet scanning is busy right now. Please try again soon.",
        status: 503
      };
    }

    return {
      code: "ocr_upstream_error",
      message: "Worksheet scanning is unavailable right now. Please try again.",
      status: 502
    };
  }

  return {
    code: "internal_error",
    message: "Something went wrong while scanning the worksheet.",
    status: 500
  };
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
