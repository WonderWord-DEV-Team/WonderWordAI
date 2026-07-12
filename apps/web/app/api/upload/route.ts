import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "anthropic_key_missing",
          message: "Anthropic API Key is not configured in environment variables."
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        {
          error: "file_missing",
          message: "No file was uploaded. Please send a file field in form-data."
        },
        { status: 400 }
      );
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: "invalid_file_type",
          message: `Unsupported image type. Allowed types: ${allowedTypes.join(", ")}`
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString("base64");

    const anthropic = new Anthropic({ apiKey });

    const promptText = `You are an OCR engine.

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
- Keep keywords to 1–3 words.

Good: birthday party, red balloon, pig, farm, school bus
Bad: worksheet, reading comprehension, education, exercise, question

Return ONLY this JSON:

{
  "text": "...",
  "image_keywords": ["keyword1", "keyword2"]
}`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: file.type as any,
                data: base64Image
              }
            },
            {
              type: "text",
              text: promptText
            }
          ]
        }
      ]
    });

    const contentBlock = response.content[0];
    if (contentBlock.type !== "text") {
      throw new Error("Unexpected response type from Anthropic API.");
    }

    const rawOutput = contentBlock.text.trim();

    let parsedData;
    try {
      const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
      const cleanedJson = jsonMatch ? jsonMatch[0] : rawOutput;
      parsedData = JSON.parse(cleanedJson);
    } catch (parseError) {
      console.error("Failed to parse Claude output as JSON:", rawOutput);
      return NextResponse.json(
        {
          error: "ocr_parse_failed",
          message: "Failed to parse OCR response as structured JSON data.",
          rawOutput
        },
        { status: 500 }
      );
    }

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("OCR Route error:", error);

    if (error instanceof Anthropic.APIError) {
      const status = error.status;
      const errorMessage = (error.message || "").toLowerCase();
      const errorType = (error.type || "").toLowerCase();

      let friendlyMessage = error.message;
      let errorCategory = "anthropic_api_error";

      if (
        status === 429 ||
        errorMessage.includes("credit") ||
        errorMessage.includes("billing") ||
        errorMessage.includes("quota") ||
        errorType.includes("credit") ||
        errorType.includes("rate_limit")
      ) {
        errorCategory = "insufficient_credits_or_rate_limit";
        friendlyMessage = "Anthropic API: Insufficient credits or rate limit exceeded.";
      } else if (
        status === 400 &&
        (errorMessage.includes("model") ||
          errorMessage.includes("not found") ||
          errorMessage.includes("unknown") ||
          errorMessage.includes("supported"))
      ) {
        errorCategory = "model_not_found_or_discontinued";
        friendlyMessage = `Anthropic API: The model may be discontinued or invalid. Detail: ${error.message}`;
      } else if (status === 401 || status === 403) {
        errorCategory = "authentication_error";
        friendlyMessage = "Anthropic API: Authentication or permission error. Check your API Key.";
      }

      return NextResponse.json(
        {
          error: errorCategory,
          message: friendlyMessage,
          details: {
            status,
            type: error.type,
            rawMessage: error.message
          }
        },
        { status: status || 500 }
      );
    }

    return NextResponse.json(
      {
        error: "internal_error",
        message: error.message || "An unexpected error occurred during OCR processing."
      },
      { status: 500 }
    );
  }
}
