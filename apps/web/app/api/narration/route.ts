import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const text = body.text;

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API Key is not configured in environment variables." },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    // Call OpenAI TTS directly
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
      response_format: "mp3",
    });

    // Convert response stream to base64
    const buffer = Buffer.from(await mp3.arrayBuffer());
    const audio_base64 = buffer.toString("base64");

    return NextResponse.json({
      data: {
        audio_base64,
        mime_type: "audio/mpeg",
      },
    });
  } catch (error: any) {
    console.error("OpenAI TTS generation failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate narration" },
      { status: 502 }
    );
  }
}
