import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { parseUserRole } from "@/lib/auth/types";
import { extractWorksheetText, mapOcrUpstreamError } from "@/lib/ocr/client";
import {
  isAllowedImageType,
  validateWorksheetImageFile,
  type OcrErrorBody,
  type OcrErrorCode
} from "@/lib/ocr/schema";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { READING_SESSION_SELECT, sessionIdSchema, type ReadingSessionRow } from "@/lib/sessions/api";

export const dynamic = "force-dynamic";

type AppUser = {
  id: string;
  role: "CHILD" | "PARENT";
};

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return errorResponse("configuration_error", "Supabase is not configured.", 500);
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch (error) {
    console.error("Failed to read worksheet upload form data.", error);

    return errorResponse("invalid_session", "The upload request is invalid.", 400);
  }

  const sessionId = formData.get("sessionId");

  if (typeof sessionId !== "string" || !sessionId.trim()) {
    return errorResponse("session_missing", "A reading session is required.", 400);
  }

  const parsedSessionId = sessionIdSchema.safeParse(sessionId);

  if (!parsedSessionId.success) {
    return errorResponse("invalid_session", "The reading session is invalid.", 400);
  }

  const file = formData.get("file");
  const worksheetFile = file instanceof File ? file : null;
  const fileError = validateWorksheetImageFile(worksheetFile);

  if (fileError) {
    return errorResponse(fileError.code, fileError.message, fileError.status);
  }

  if (!worksheetFile || !isAllowedImageType(worksheetFile.type)) {
    return errorResponse("invalid_file_type", "Please upload a JPEG, PNG, or WebP image.", 400);
  }

  const supabase = createClient();
  const { appUser, response } = await getAuthenticatedChildUser(supabase);

  if (response) {
    return response;
  }

  const { data: session, error: sessionError } = await supabase
    .from("reading_sessions")
    .select(READING_SESSION_SELECT)
    .eq("id", parsedSessionId.data)
    .maybeSingle<ReadingSessionRow>();

  if (sessionError) {
    console.error("Failed to fetch reading session for worksheet upload.", sessionError);

    return errorResponse("internal_error", "Unable to verify the reading session.", 500);
  }

  if (!session || session.child_id !== appUser.id) {
    return errorResponse("not_found", "Reading session not found.", 404);
  }

  if (session.end_time) {
    return errorResponse("session_closed", "This reading session is already closed.", 409);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return errorResponse("configuration_error", "Worksheet scanning is not configured.", 500);
  }

  try {
    const buffer = Buffer.from(await worksheetFile.arrayBuffer());
    const ocrResult = await extractWorksheetText({
      apiKey,
      base64Image: buffer.toString("base64"),
      mediaType: worksheetFile.type
    });

    return NextResponse.json({
      data: {
        sessionId: session.id,
        text: ocrResult.text,
        imageKeywords: ocrResult.image_keywords
      }
    });
  } catch (error) {
    logOcrError(error);

    const stableError = mapOcrUpstreamError(error);

    return errorResponse(stableError.code, stableError.message, stableError.status);
  }
}

async function getAuthenticatedChildUser(
  supabase: ReturnType<typeof createClient>
): Promise<
  | { appUser: AppUser; response: null }
  | { appUser: null; response: NextResponse<OcrErrorBody> }
> {
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      appUser: null,
      response: errorResponse("unauthorized", "Authentication is required.", 401)
    };
  }

  const { data: appUserRow, error: appUserError } = await supabase
    .from("users")
    .select("id, auth_id, role")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (appUserError) {
    console.error("Failed to resolve authenticated application user for worksheet upload.", appUserError);

    return {
      appUser: null,
      response: errorResponse("internal_error", "Unable to resolve the authenticated user.", 500)
    };
  }

  const role = parseUserRole(appUserRow?.role);

  if (!appUserRow || !role) {
    return {
      appUser: null,
      response: errorResponse("forbidden", "This account is not authorized.", 403)
    };
  }

  if (role !== "CHILD") {
    return {
      appUser: null,
      response: errorResponse("forbidden", "Only child accounts can scan worksheets.", 403)
    };
  }

  return {
    appUser: {
      id: appUserRow.id,
      role
    },
    response: null
  };
}

function errorResponse(code: OcrErrorCode, message: string, status: number) {
  return NextResponse.json<OcrErrorBody>({ error: { code, message } }, { status });
}

function logOcrError(error: unknown) {
  if (error instanceof Anthropic.APIError) {
    console.error("Anthropic OCR request failed.", {
      status: error.status,
      type: error.type,
      requestID: error.requestID,
      message: error.message
    });

    return;
  }

  if (error instanceof Error) {
    console.error("Worksheet OCR failed.", {
      name: error.name,
      message: error.message
    });

    return;
  }

  console.error("Worksheet OCR failed with unknown error type.");
}
