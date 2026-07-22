import { NextRequest, NextResponse } from "next/server";
import { imageGenerationRequestSchema, type ImageGenerationResponse } from "@/lib/illustrations/schema";
import { searchUnsplash } from "@/lib/illustrations/unsplash/client";
import { generateDalleImage } from "@/lib/illustrations/dalle/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const parsedRequest = imageGenerationRequestSchema.safeParse(body);
    if (!parsedRequest.success) {
      return NextResponse.json(
        { error: parsedRequest.error.issues[0]?.message || "Validation failed." },
        { status: 400 }
      );
    }

    const { word, mode } = parsedRequest.data;

    let url: string | null = null;
    let source = "none";

    if (mode === "unsplash") {
      url = await searchUnsplash(word);
      source = "unsplash";
    } else if (mode === "openai") {
      url = await generateDalleImage(word);
      source = "openai (gpt-image-2)";
    } else {
      url = await searchUnsplash(word);
      if (url) {
        source = "unsplash (auto)";
      } else {
        url = await generateDalleImage(word);
        if (url) {
          source = "openai (auto fallback)";
        } else {
          url = "";
          source = "failed all";
        }
      }
    }

    const responsePayload: ImageGenerationResponse = {
      url: url || "",
      source
    };

    return NextResponse.json(responsePayload);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
