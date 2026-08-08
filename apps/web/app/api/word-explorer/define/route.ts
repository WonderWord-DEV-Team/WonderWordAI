import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedAppUser } from "@/lib/sessions/api";

export const dynamic = "force-dynamic";

type WordDefinitionErrorCode =
    | "validation_error"
    | "unauthorized"
    | "forbidden"
    | "configuration_error"
    | "upstream_error";

function apiErrorResponse(code: WordDefinitionErrorCode, message: string, status: number) {
    return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: NextRequest) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return apiErrorResponse("validation_error", "Invalid JSON request body.", 400);
    }

    const word =
        typeof (body as { word?: unknown })?.word === "string"
            ? (body as { word: string }).word.trim()
            : "";

    if (!word) {
        return apiErrorResponse("validation_error", "word is required.", 400);
    }

    const supabase = createClient();
    const { appUser, response: authResponse } = await getAuthenticatedAppUser(supabase);
    if (authResponse) {
        return authResponse;
    }

    if (appUser.role !== "CHILD") {
        return apiErrorResponse("forbidden", "Only child accounts can use Word Explorer.", 403);
    }

    const mlServiceUrl = process.env.ML_SERVICE_URL;
    const mlServiceKey = process.env.ML_SERVICE_KEY;

    if (!mlServiceUrl || !mlServiceKey) {
        return apiErrorResponse("configuration_error", "Word Explorer is not configured.", 500);
    }

    try {
        const response = await fetch(`${mlServiceUrl.replace(/\/$/, "")}/word-definition`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Internal-Key": mlServiceKey
            },
            body: JSON.stringify({ word }),
            signal: AbortSignal.timeout(15_000)
        });

        if (!response.ok) {
            console.error(`ml-service /word-definition returned ${response.status}`);
            return apiErrorResponse("upstream_error", "Could not look up that word right now.", 502);
        }

        const data = await response.json();
        return NextResponse.json({ data });
    } catch (error) {
        console.error("Word Explorer definition lookup failed.", error);
        return apiErrorResponse("upstream_error", "Could not look up that word right now.", 502);
    }
}