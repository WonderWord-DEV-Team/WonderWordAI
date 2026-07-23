import { z } from "zod";

export type ReportErrorCode =
    | "configuration_error"
    | "unauthorized"
    | "forbidden"
    | "validation_error"
    | "report_generation_failed"
    | "report_malformed_response"
    | "report_timeout"
    | "report_upstream_error"
    | "internal_error";

export type ReportErrorBody = {
    error: {
        code: ReportErrorCode;
        message: string;
    };
};

// REQUEST VALIDATION (CLIENT INPUT)
export const reportGenerationRequestSchema = z.object({
    childId: z.string().uuid("childId must be a valid UUID"),
    cycleStart: z.string().datetime("cycleStart must be a valid ISO datetime string"),
    cycleEnd: z.string().datetime("cycleEnd must be a valid ISO datetime string")
});

export type ReportGenerationRequest = z.infer<typeof reportGenerationRequestSchema>;

export const reportGenerationBodySchema = z.object({
    cycleStart: z.string().datetime("cycleStart must be a valid ISO datetime string"),
    cycleEnd: z.string().datetime("cycleEnd must be a valid ISO datetime string")
});

export type ReportGenerationBody = z.infer<typeof reportGenerationBodySchema>;

// AI MODEL RESPONSE VALIDATION (AI OUTPUT)
export const reportModelResponseSchema = z.object({
    narrative_text: z.string().min(1, "narrative_text must not be empty"),
    top_deficits: z.array(z.string()).describe("List of phonics categories the child struggled with")
});

export type ReportModelResponse = z.infer<typeof reportModelResponseSchema>;

// PARSING HELPER METHODS
export function extractJsonObject(rawOutput: string) {
    const trimmed = rawOutput.trim();
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
        return trimmed;
    }

    return trimmed.slice(firstBrace, lastBrace + 1);
}

export function parseReportModelResponse(rawOutput: string) {
    let parsed: unknown;

    try {
        parsed = JSON.parse(extractJsonObject(rawOutput));
    } catch (error) {
        return {
            success: false as const,
            error
        };
    }

    const result = reportModelResponseSchema.safeParse(parsed);

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