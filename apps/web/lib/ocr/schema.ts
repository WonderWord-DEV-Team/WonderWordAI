import { z } from "zod";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_WORKSHEET_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_KEYWORDS = 7;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export type OcrErrorCode =
  | "configuration_error"
  | "file_missing"
  | "invalid_file_type"
  | "file_empty"
  | "file_too_large"
  | "session_missing"
  | "invalid_session"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "session_closed"
  | "ocr_malformed_response"
  | "ocr_authentication_error"
  | "ocr_rate_limited"
  | "ocr_upstream_error"
  | "ocr_timeout"
  | "internal_error";

export type OcrErrorBody = {
  error: {
    code: OcrErrorCode;
    message: string;
  };
};

export const ocrModelResponseSchema = z
  .object({
    text: z.string().transform(normalizeWorksheetText),
    image_keywords: z
      .array(z.string())
      .max(MAX_IMAGE_KEYWORDS)
      .transform(normalizeImageKeywords)
      .default([])
  })
  .strict();

export type OcrModelResponse = z.infer<typeof ocrModelResponseSchema>;

export function isAllowedImageType(type: string): type is AllowedImageType {
  return ALLOWED_IMAGE_TYPES.includes(type as AllowedImageType);
}

export function validateWorksheetImageFile(file: File | null) {
  if (!file) {
    return {
      code: "file_missing" as const,
      message: "Please choose a worksheet photo first.",
      status: 400
    };
  }

  if (!isAllowedImageType(file.type)) {
    return {
      code: "invalid_file_type" as const,
      message: "Please upload a JPEG, PNG, or WebP image.",
      status: 400
    };
  }

  if (file.size === 0) {
    return {
      code: "file_empty" as const,
      message: "That image is empty. Please choose another photo.",
      status: 400
    };
  }

  if (file.size > MAX_WORKSHEET_IMAGE_BYTES) {
    return {
      code: "file_too_large" as const,
      message: "Please upload an image smaller than 10 MB.",
      status: 413
    };
  }

  return null;
}

export function normalizeWorksheetText(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizeImageKeywords(keywords: string[]) {
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const keyword of keywords) {
    const value = keyword.replace(/\s+/g, " ").trim();

    if (!value) {
      continue;
    }

    const key = value.toLocaleLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(value);

    if (normalized.length === MAX_IMAGE_KEYWORDS) {
      break;
    }
  }

  return normalized;
}

export function extractJsonObject(rawOutput: string) {
  const trimmed = rawOutput.trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    return trimmed;
  }

  return trimmed.slice(firstBrace, lastBrace + 1);
}

export function parseOcrModelResponse(rawOutput: string) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(extractJsonObject(rawOutput));
  } catch (error) {
    return {
      success: false as const,
      error
    };
  }

  const result = ocrModelResponseSchema.safeParse(parsed);

  if (!result.success) {
    return {
      success: false as const,
      error: result.error
    };
  }

  return {
    success: true as const,
    data: result.data
  };
}
