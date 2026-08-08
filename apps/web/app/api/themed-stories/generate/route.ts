import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedAppUser } from "@/lib/sessions/api";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const THEMED_STORY_SYSTEM_PROMPT = `You are a warm, playful children's story writer, writing a short story
for a parent to read ALOUD together with their child (K-5, ages 5-11).

This is a FOR-FUN story based on a theme the child picked — not a corrective or
teaching exercise. Keep it light, imaginative, and read-aloud friendly.

Rules:
- Around 80-100 words. Very short and quick to read.
- Simple, age-appropriate vocabulary and sentence structure.
- Warm, silly, or adventurous tone — never scary or sad.
- Give the story a short, fun title.

Return ONLY this JSON:
{
  "title": "...",
  "text": "..."
}
`;

function apiErrorResponse(code: string, message: string, status: number) {
    return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: NextRequest) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return apiErrorResponse("validation_error", "Invalid JSON request body.", 400);
    }

    const theme =
        typeof (body as { theme?: unknown })?.theme === "string"
            ? (body as { theme: string }).theme.trim()
            : "";
    const grade =
        typeof (body as { grade?: unknown })?.grade === "number"
            ? (body as { grade: number }).grade
            : undefined;

    if (!theme) {
        return apiErrorResponse("validation_error", "theme is required.", 400);
    }

    const supabase = createClient();
    const { appUser, response: authResponse } = await getAuthenticatedAppUser(supabase);
    if (authResponse) {
        return authResponse;
    }

    if (appUser.role !== "CHILD") {
        return apiErrorResponse("forbidden", "Only child accounts can generate themed stories.", 403);
    }

    // Fetch child's registered school grade from child_profiles table
    const { data: profile } = await supabase
        .from("child_profiles")
        .select("grade")
        .eq("child_id", appUser.id)
        .maybeSingle();

    const finalGrade = profile?.grade ?? grade ?? 2;

    const mlServiceUrl = process.env.ML_SERVICE_URL;
    const mlServiceKey = process.env.ML_SERVICE_KEY;

    let storyData: { title: string; text: string } | null = null;

    // 1. Attempt to fetch from Python ml-service if configured
    if (mlServiceUrl && mlServiceKey) {
        try {
            const response = await fetch(`${mlServiceUrl.replace(/\/$/, "")}/themed-story`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Internal-Key": mlServiceKey
                },
                body: JSON.stringify({ theme, grade: finalGrade }),
                signal: AbortSignal.timeout(12_000)
            });

            if (response.ok) {
                const data = await response.json();
                if (data && data.title && data.text) {
                    storyData = {
                        title: data.title,
                        text: data.text
                    };
                }
            }
        } catch (error) {
            console.warn("Python ML Service was unreachable or failed. Attempting direct Anthropic direct call:", error);
        }
    }

    // 2. Fallback to calling Anthropic Claude directly from Next.js server if Python service failed or isn't set up
    if (!storyData) {
        const anthropicKey = process.env.ANTHROPIC_API_KEY;
        if (!anthropicKey) {
            return apiErrorResponse(
                "configuration_error",
                "ML service is not active and ANTHROPIC_API_KEY is not configured.",
                500
            );
        }

        try {
            const anthropic = new Anthropic({ apiKey: anthropicKey });
            const gradeHint = finalGrade ? ` The reader is around grade ${finalGrade}.` : "";

            const message = await anthropic.messages.create({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 600,
                system: THEMED_STORY_SYSTEM_PROMPT,
                messages: [
                    { role: "user", content: `Theme: "${theme}".${gradeHint}` }
                ]
            });

            const contentText = message.content[0].type === "text" ? message.content[0].text : "";

            // Extract JSON block
            const firstBrace = contentText.indexOf("{");
            const lastBrace = contentText.lastIndexOf("}");

            if (firstBrace === -1 || lastBrace === -1) {
                throw new Error("Claude did not return a valid JSON block.");
            }

            const jsonText = contentText.slice(firstBrace, lastBrace + 1);
            const parsed = JSON.parse(jsonText);

            if (parsed && parsed.title && parsed.text) {
                storyData = {
                    title: String(parsed.title).trim(),
                    text: String(parsed.text).trim()
                };
            } else {
                throw new Error("Parsed JSON structure does not contain 'title' and 'text'.");
            }
        } catch (anthropicError: any) {
            console.error("Direct Anthropic story generation fallback failed:", anthropicError);
            return apiErrorResponse(
                "upstream_error",
                `Failed to generate themed story: ${anthropicError.message || "Unknown error"}`,
                502
            );
        }
    }

    // Return wrapped in the { data } key format expected by frontend!
    return NextResponse.json({
        data: {
            title: storyData.title,
            text: storyData.text
        }
    });
}