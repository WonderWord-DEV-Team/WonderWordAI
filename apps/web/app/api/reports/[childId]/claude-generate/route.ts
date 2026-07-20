
import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { errorResponse, getAuthenticatedAppUser } from "@/lib/sessions/api";
import {
    reportGenerationBodySchema,
    type ReportErrorBody,
    type ReportErrorCode
} from "@/lib/reports/claude/schema";
import { reportChildIdParamSchema } from "@/lib/reports/schema";
import { generateReportWithHaiku, mapReportUpstreamError } from "@/lib/reports/claude/client";
import { calculateAccuracyPct } from "@/lib/parent/dashboard";

export const dynamic = "force-dynamic";

type ParentChildRow = {
    parent_id: string;
    child_id: string;
};

type ChildProfileRow = {
    child_id: string;
    name: string;
};

type ReadingSessionRow = {
    id: string;
    start_time: string;
    end_time: string | null;
    total_words: number;
    correct_words: number;
};

type ReadingEventRow = {
    word: string;
    expected_phonemes: string;
    actual_phonemes: string;
    phonics_category: string;
};

export async function POST(
    request: NextRequest,
    { params }: { params: { childId: string } }
) {
    if (!hasSupabaseEnv()) {
        return apiErrorResponse("configuration_error", "Supabase is not configured.", 500);
    }

    const parsedChildId = reportChildIdParamSchema.safeParse(params.childId);
    if (!parsedChildId.success) {
        return apiErrorResponse("validation_error", "Invalid childId path parameter.", 400);
    }
    const childId = parsedChildId.data;

    let body: unknown;
    try {
        body = await request.json();
    } catch (error) {
        console.error("Failed to parse report generation request body.", error);
        return apiErrorResponse("validation_error", "Invalid JSON request body.", 400);
    }

    const parsedBody = reportGenerationBodySchema.safeParse(body);
    if (!parsedBody.success) {
        return apiErrorResponse(
            "validation_error",
            parsedBody.error.issues[0]?.message || "Validation failed.",
            400
        );
    }

    const { cycleStart, cycleEnd } = parsedBody.data;

    // AUTHENTICATION & PARENT ROLE CHECK
    const supabase = createClient();
    const { appUser, response: authResponse } = await getAuthenticatedAppUser(supabase);
    if (authResponse) {
        return authResponse;
    }

    if (appUser.role !== "PARENT") {
        return apiErrorResponse("forbidden", "Only parent accounts can generate progress reports.", 403);
    }

    // AUTHORIZATION CHECK (PARENT-CHILD RELATIONSHIP)
    const { data: relationship, error: relError } = await supabase
        .from("parent_child")
        .select("parent_id, child_id")
        .eq("parent_id", appUser.id)
        .eq("child_id", childId)
        .maybeSingle<ParentChildRow>();

    if (relError) {
        console.error("Failed to verify parent-child relationship.", relError);
        return apiErrorResponse("internal_error", "Unable to verify parent-child relationship.", 500);
    }

    if (!relationship) {
        return apiErrorResponse("forbidden", "You are not authorized to access reports for this child.", 403);
    }

    // FETCH CHILD PROFILE (for name)
    const { data: childProfile, error: profileError } = await supabase
        .from("child_profiles")
        .select("child_id, name")
        .eq("child_id", childId)
        .maybeSingle<ChildProfileRow>();

    if (profileError || !childProfile) {
        console.error("Failed to fetch child profile.", profileError);
        return apiErrorResponse("internal_error", "Unable to retrieve child details.", 500);
    }

    // FETCH SESSIONS IN DATE RANGE
    const { data: sessions, error: sessionsError } = await supabase
        .from("reading_sessions")
        .select("id, start_time, end_time, total_words, correct_words")
        .eq("child_id", childId)
        .gte("start_time", cycleStart)
        .lte("start_time", cycleEnd)
        .returns<ReadingSessionRow[]>();

    if (sessionsError) {
        console.error("Failed to fetch reading sessions for report.", sessionsError);
        return apiErrorResponse("internal_error", "Unable to load reading session metrics.", 500);
    }

    // FETCH MISCUES (is_correct = false) IN DATE RANGE
    const { data: miscues, error: miscuesError } = await supabase
        .from("reading_events")
        .select("word, expected_phonemes, actual_phonemes, phonics_category")
        .eq("child_id", childId)
        .eq("is_correct", false)
        .gte("timestamp", cycleStart)
        .lte("timestamp", cycleEnd)
        .returns<ReadingEventRow[]>();

    if (miscuesError) {
        console.error("Failed to fetch reading miscues for report.", miscuesError);
        return apiErrorResponse("internal_error", "Unable to load reading error metrics.", 500);
    }

    // CALCULATE METRICS
    const sessionCount = sessions.length;
    const totalWords = sessions.reduce((sum, s) => sum + s.total_words, 0);
    const correctWords = sessions.reduce((sum, s) => sum + s.correct_words, 0);
    const accuracyPct = calculateAccuracyPct(totalWords, correctWords);

    // Calculate WCPM (Words Correct Per Minute) for sessions that have durations
    let totalWcpm = 0;
    let sessionsWithDurationCount = 0;

    for (const session of sessions) {
        if (session.end_time) {
            const durationMs = Date.parse(session.end_time) - Date.parse(session.start_time);
            const durationMin = durationMs / (1000 * 60);
            if (durationMin > 0) {
                totalWcpm += session.correct_words / durationMin;
                sessionsWithDurationCount++;
            }
        }
    }

    const currentWcpm = sessionsWithDurationCount > 0 ? Math.round(totalWcpm / sessionsWithDurationCount) : null;

    // Calculate WCPM Delta against the most recent generated report
    let wcpmDelta: number | null = null;
    if (currentWcpm !== null) {
        const { data: lastReport, error: lastReportError } = await supabase
            .from("generated_reports")
            .select("wcpm")
            .eq("child_id", childId)
            .order("cycle_end", { ascending: false })
            .limit(1)
            .maybeSingle<{ wcpm: number | null }>();

        if (!lastReportError && lastReport && lastReport.wcpm !== null) {
            wcpmDelta = currentWcpm - lastReport.wcpm;
        }
    }

    // CALL CLAUDE HAIKU FOR REPORT GENERATION
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        return apiErrorResponse("configuration_error", "Report generation service key is not configured.", 500);
    }

    try {
        const haikuResult = await generateReportWithHaiku({
            apiKey,
            childName: childProfile.name,
            metrics: {
                sessionCount,
                totalWords,
                correctWords,
                accuracyPct
            },
            miscues: miscues.map((m) => ({
                word: m.word,
                expected_phonemes: m.expected_phonemes,
                actual_phonemes: m.actual_phonemes,
                phonics_category: m.phonics_category
            }))
        });

        // PERSIST REPORT TO DATABASE
        const { data: savedReport, error: insertError } = await supabase
            .from("generated_reports")
            .insert({
                child_id: childId,
                narrative_text: haikuResult.narrative_text,
                activity_recommendation: haikuResult.suggested_activities,
                cycle_start: cycleStart,
                cycle_end: cycleEnd,
                wcpm: currentWcpm,
                wcpm_delta: wcpmDelta,
                accuracy_pct: accuracyPct,
                top_deficits: haikuResult.top_deficits
            })
            .select()
            .single();

        if (insertError) {
            console.error("Failed to insert generated report into database.", insertError);
            return apiErrorResponse("internal_error", "Report generated successfully but failed to persist.", 500);
        }

        return NextResponse.json({
            data: savedReport
        });
    } catch (error) {
        console.error("Report generation failed:", error);
        const stableError = mapReportUpstreamError(error);
        return apiErrorResponse(stableError.code, stableError.message, stableError.status);
    }
}

function apiErrorResponse(code: ReportErrorCode, message: string, status: number) {
    return NextResponse.json<ReportErrorBody>({ error: { code, message } }, { status });
}