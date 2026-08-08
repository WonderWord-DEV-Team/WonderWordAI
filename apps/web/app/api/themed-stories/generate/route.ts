import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedAppUser } from "@/lib/sessions/api";

export const dynamic = "force-dynamic";

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

    const mlServiceUrl = process.env.ML_SERVICE_URL;
    const mlServiceKey = process.env.ML_SERVICE_KEY;

    if (!mlServiceUrl || !mlServiceKey) {
        return apiErrorResponse("configuration_error", "Themed stories are not configured.", 500);
    }

    try {
        const response = await fetch(`${mlServiceUrl.replace(/\/$/, "")}/themed-story`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Internal-Key": mlServiceKey
            },
            body: JSON.stringify({ theme, grade }),
            signal: AbortSignal.timeout(20_000)
        });

        if (!response.ok) {
            return apiErrorResponse("upstream_error", "Could not generate a story right now.", 502);
        }

        const data = await response.json();
        return NextResponse.json({ data });
    } catch (error) {
        console.error("Themed story generation failed.", error);
        return apiErrorResponse("upstream_error", "Could not generate a story right now.", 502);
    }
}