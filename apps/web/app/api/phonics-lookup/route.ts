import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
    errorResponse,
    getAuthenticatedAppUser,
    readJsonObject
} from "@/lib/sessions/api";
import {
    phonicsLookupRequestSchema,
    phonicsLookupResponseSchema,
    type PhonicsErrorCode,
    type PhonicsErrorBody
} from "@/lib/phonics/schema";
import { lookupPhonicsRule, PhonicsUpstreamError } from "@/lib/phonics/client";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    if (!hasSupabaseEnv()) {
        return localErrorResponse(
            "configuration_error",
            "Supabase is not configured.",
            500
        );
    }

    const body = await readJsonObject(request);
    if (!body) {
        return localErrorResponse(
            "stuck_word_missing",
            "The request payload is invalid.",
            400
        );
    }

    const parsedRequest = phonicsLookupRequestSchema.safeParse(body);
    if (!parsedRequest.success) {
        return localErrorResponse(
            "stuck_word_missing",
            "stuck_word is required.",
            400
        );
    }

    const { stuck_word, error_description } = parsedRequest.data;

    const supabase = createClient();
    const { appUser, response: authResponse } = await getAuthenticatedAppUser(supabase);

    if (authResponse) {
        return authResponse;
    }

    try {
        const mlResponse = await lookupPhonicsRule({
            stuckWord: stuck_word,
            errorDescription: error_description
        });

        const bestMatch = mlResponse.matches[0];
        if (!bestMatch) {
            return localErrorResponse(
                "no_rule_found",
                "No phonics rule matched this word.",
                404
            );
        }

        const responsePayload = {
            category: bestMatch.category,
            rule_explanation: bestMatch.phonics_rule,
            examples: bestMatch.example_words,
            similarity_score: bestMatch.similarity
        };

        const parsedResponse = phonicsLookupResponseSchema.safeParse(responsePayload);
        if (!parsedResponse.success) {
            console.error("Outgoing phonics response validation failed.", parsedResponse.error);
            return localErrorResponse(
                "internal_error",
                "Failed to format the phonics lookup response.",
                500
            );
        }

        return NextResponse.json(parsedResponse.data);

    } catch (error) {
        if (error instanceof PhonicsUpstreamError) {
            return localErrorResponse(error.code, error.message, error.status);
        }

        console.error("Unexpected error in phonics-lookup route:", error);
        return localErrorResponse(
            "internal_error",
            "An unexpected error occurred during phonics lookup.",
            500
        );
    }
}

function localErrorResponse(code: PhonicsErrorCode, message: string, status: number) {
    return NextResponse.json<PhonicsErrorBody>({ error: { code, message } }, { status });
}
