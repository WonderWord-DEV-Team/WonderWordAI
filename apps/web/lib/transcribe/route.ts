import { NextRequest, NextResponse } from "next/server";
import { parseUserRole } from "@/lib/auth/types";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { isAllowedAudioType } from "@/lib/transcribe/schema";
import { transcribeResultSchema } from "@/lib/transcribe/schema";

export const dynamic = "force-dynamic";

type AppUser = {
  id: string;
  role: "CHILD" | "PARENT";
};

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      {
        error: {
          code: "configuration_error",
          message: "Supabase is not configured."
        }
      },
      { status: 500 }
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "audio_missing",
          message: "No audio file provided."
        }
      },
      { status: 400 }
    );
  }

  const audio = formData.get("audio");
  const audioFile = audio instanceof File ? audio : null;

  if (!audioFile) {
    return NextResponse.json(
      {
        error: {
          code: "audio_missing",
          message: "No audio file provided."
        }
      },
      { status: 400 }
    );
  }

  if (!isAllowedAudioType(audioFile.type)) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_audio_type",
          message: "Please upload a WebM or WAV audio file."
        }
      },
      { status: 400 }
    );
  }

  const supabase = createClient();
  const { appUser, response } = await getAuthenticatedChildUser(supabase);

  if (response) {
    return response;
  }

    const mlServiceUrl = process.env.ML_SERVICE_URL;
  const mlServiceKey = process.env.ML_SERVICE_KEY;

  if (!mlServiceUrl || !mlServiceKey) {
    return NextResponse.json(
      {
        error: {
          code: "configuration_error",
          message: "Transcribe service is not configured."
        }
      },
      { status: 500 }
    );
  }

  const formDataToSend = new FormData();
  formDataToSend.append("audio", audioFile, audioFile.name || "recording.webm");

  const mlResponse = await fetch(`${mlServiceUrl.replace(/\/$/, "")}/transcribe`, {
    method: "POST",
    headers: {
      "X-Internal-Key": mlServiceKey
    },
    body: formDataToSend,
    cache: "no-store"
  });

  const mlPayload = await mlResponse.json().catch(() => null);

  const parsedResult = transcribeResultSchema.safeParse(mlPayload);

  if (!parsedResult.success) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_transcribe_payload",
          message: "The transcript response did not match the expected format."
        }
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    result: parsedResult.data
  });

  if (!mlResponse.ok) {
    return NextResponse.json(
      {
        error: {
          code: "upstream_error",
          message: "We could not transcribe that audio right now."
        }
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    result: mlPayload
  });

async function getAuthenticatedChildUser(
  supabase: ReturnType<typeof createClient>
): Promise<
  | { appUser: AppUser; response: null }
  | { appUser: null; response: NextResponse }
> {
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      appUser: null,
      response: NextResponse.json(
        {
          error: {
            code: "unauthorized",
            message: "Authentication is required."
          }
        },
        { status: 401 }
      )
    };
  }

  const { data: appUserRow, error: appUserError } = await supabase
    .from("users")
    .select("id, auth_id, role")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (appUserError) {
    return {
      appUser: null,
      response: NextResponse.json(
        {
          error: {
            code: "internal_error",
            message: "Unable to resolve the authenticated user."
          }
        },
        { status: 500 }
      )
    };
  }

  const role = parseUserRole(appUserRow?.role);

  if (!appUserRow || !role) {
    return {
      appUser: null,
      response: NextResponse.json(
        {
          error: {
            code: "forbidden",
            message: "This account is not authorized."
          }
        },
        { status: 403 }
      )
    };
  }

  if (role !== "CHILD") {
    return {
      appUser: null,
      response: NextResponse.json(
        {
          error: {
            code: "forbidden",
            message: "Only child accounts can transcribe audio."
          }
        },
        { status: 403 }
      )
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
}