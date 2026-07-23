
import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import {
    parseReportModelResponse,
    type ReportErrorCode,
    type ReportModelResponse
} from "./schema";

const REPORT_MODEL = "claude-haiku-4-5-20251001";
const REPORT_TIMEOUT_MS = 60_000;

const REPORT_SYSTEM_PROMPT = `You are a supportive, expert reading coach and childhood development specialist writing to a parent.

Your task is to generate a biweekly progress report for a child learning to read. You will receive the child's name, general reading stats, and a list of specific reading errors/miscues they made.

Rules for Report Generation:
1. **Tone**: Warm, encouraging, empathetic, and professional. Avoid overly technical jargon, but clearly explain what phonics concepts they are learning.
2. **Structure**:
   - Start with a positive narrative celebrating what they did well (e.g., number of sessions completed, general accuracy).
   - Gently address the specific areas they are struggling with based on the provided miscues and phonics categories. Explain the spelling patterns or phonetic rules in simple terms for the parent.
   - Summarize the top deficits (phonics categories).
3. **Format**: Return ONLY a valid JSON object matching the schema below:
{
  "narrative_text": "...",
  "top_deficits": ["category-slug-1", "category-slug-2"]
}`;

export class ReportMalformedResponseError extends Error {
    constructor(message = "Claude returned malformed Report JSON.") {
        super(message);
        this.name = "ReportMalformedResponseError";
    }
}

export type StableReportUpstreamError = {
    code: ReportErrorCode;
    message: string;
    status: number;
};

export async function generateReportWithHaiku({
    apiKey,
    childName,
    metrics,
    miscues
}: {
    apiKey: string;
    childName: string;
    metrics: {
        sessionCount: number;
        totalWords: number;
        correctWords: number;
        accuracyPct: number | null;
    };
    miscues: Array<{
        word: string;
        expected_phonemes: string;
        actual_phonemes: string;
        phonics_category: string;
    }>;
}): Promise<ReportModelResponse> {
    const anthropic = new Anthropic({
        apiKey,
        timeout: REPORT_TIMEOUT_MS,
        maxRetries: 0
    });

    const promptText = `Generate a biweekly progress report with the following details:
- Child Name: "${childName}"
- Sessions Completed: ${metrics.sessionCount}
- Total Words Attempted: ${metrics.totalWords}
- Correct Words Read: ${metrics.correctWords}
- Accuracy Rate: ${metrics.accuracyPct !== null ? `${metrics.accuracyPct}%` : "N/A"}
- Specific Reading Errors/Miscues:
${miscues.length > 0
            ? miscues
                .map(
                    (m, idx) =>
                        `${idx + 1}. Word: "${m.word}" | Expected: /${m.expected_phonemes}/ | Pronounced: /${m.actual_phonemes}/ | Category: "${m.phonics_category}"`
                )
                .join("\n")
            : "None (Excellent reading accuracy!)"
        }`;

    const response = await anthropic.messages.create(
        {
            model: REPORT_MODEL,
            max_tokens: 2000,
            system: [
                {
                    type: "text",
                    text: REPORT_SYSTEM_PROMPT,
                    cache_control: { type: "ephemeral" }
                }
            ],
            messages: [
                {
                    role: "user",
                    content: promptText
                }
            ]
        },
        {
            headers: {
                "anthropic-beta": "prompt-caching-2024-07-31"
            },
            timeout: REPORT_TIMEOUT_MS,
            maxRetries: 0,
            signal: AbortSignal.timeout(REPORT_TIMEOUT_MS)
        }
    );

    const textBlock = response.content.find((block) => block.type === "text");

    if (!textBlock || textBlock.type !== "text") {
        throw new ReportMalformedResponseError("Claude did not return a text content block.");
    }

    const parsed = parseReportModelResponse(textBlock.text);

    if (!parsed.success) {
        throw new ReportMalformedResponseError("Claude Report JSON failed validation.");
    }

    return parsed.data;
}

export function mapReportUpstreamError(error: unknown): StableReportUpstreamError {
    if (error instanceof ReportMalformedResponseError) {
        return {
            code: "report_malformed_response",
            message: "We could not generate a proper report. Please try again.",
            status: 502
        };
    }

    if (error instanceof Anthropic.APIConnectionTimeoutError || isAbortError(error)) {
        return {
            code: "report_timeout",
            message: "Report generation took too long. Please try again.",
            status: 504
        };
    }

    if (error instanceof Anthropic.APIError) {
        if (error.status === 401 || error.status === 403 || error.type === "authentication_error") {
            return {
                code: "configuration_error",
                message: "Report generation service is not configured correctly.",
                status: 502
            };
        }

        if (error.status === 429 || error.type === "rate_limit_error") {
            return {
                code: "report_upstream_error",
                message: "Report generation is busy right now. Please try again soon.",
                status: 503
            };
        }

        return {
            code: "report_upstream_error",
            message: "Report generation is unavailable right now. Please try again.",
            status: 502
        };
    }

    return {
        code: "internal_error",
        message: "Something went wrong while generating the report.",
        status: 500
    };
}

function isAbortError(error: unknown) {
    return error instanceof DOMException && error.name === "AbortError";
}