import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { parseUserRole, type UserRole } from "@/lib/auth/types";
import { StoryNarrationUpstreamError, narrateStoryText } from "@/lib/narration/client";
import {
  getOrCreateStoryNarrationForStory,
  getStoryNarrationConfigFromEnv,
  StoryNarrationPipelineError,
  type GeneratedStoryForNarration,
  type StoryNarrationRecord
} from "@/lib/narration/pipeline";
import {
  storyNarrationResponseSchema,
  type StoryNarrationErrorBody,
  type StoryNarrationErrorCode,
  type SupportedNarrationMimeType
} from "@/lib/narration/schema";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const storyIdSchema = z.string().uuid();

type RouteContext = {
  params: {
    storyId: string;
  };
};

type AppUser = {
  id: string;
  authId: string;
  role: UserRole;
};

type GeneratedStoryRow = {
  id: string;
  child_id: string;
  story_text: string;
};

export async function POST(_request: NextRequest, { params }: RouteContext) {
  const requestId = crypto.randomUUID();

  if (!hasSupabaseEnv() || !hasSupabaseAdminEnv()) {
    return errorResponse("configuration_error", "Application configuration is incomplete.", 500);
  }

  const parsedStoryId = storyIdSchema.safeParse(params.storyId);

  if (!parsedStoryId.success) {
    return errorResponse("story_not_found", "Story not found.", 404);
  }

  const supabase = createClient();
  const { appUser, response: authResponse } = await getAuthenticatedAppUser(supabase);

  if (authResponse) {
    return authResponse;
  }

  const { data: storyRow, error: storyError } = await supabase
    .from("generated_stories")
    .select("id, child_id, story_text")
    .eq("id", parsedStoryId.data)
    .maybeSingle<GeneratedStoryRow>();

  if (storyError) {
    console.error("Failed to fetch story for narration.", {
      requestId,
      storyId: parsedStoryId.data,
      code: storyError.code
    });

    return errorResponse("internal_error", "Unable to load the story.", 500);
  }

  if (!storyRow) {
    return errorResponse("story_not_found", "Story not found.", 404);
  }

  const story: GeneratedStoryForNarration = {
    id: storyRow.id,
    childId: storyRow.child_id,
    storyText: storyRow.story_text
  };

  const admin = createAdminClient();
  const config = getStoryNarrationConfigFromEnv();

  try {
    const data = await getOrCreateStoryNarrationForStory({
      story,
      config,
      deps: buildSupabaseNarrationDeps({
        admin,
        requestId,
        appUserId: appUser.id
      })
    });

    const responsePayload = { data };
    const parsedResponse = storyNarrationResponseSchema.safeParse(responsePayload);

    if (!parsedResponse.success) {
      console.error("Outgoing story narration response validation failed.", {
        requestId,
        storyId: story.id,
        issues: parsedResponse.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      });

      return errorResponse(
        "malformed_narration_response",
        "Unable to format narration results.",
        502
      );
    }

    return NextResponse.json(parsedResponse.data);
  } catch (error) {
    if (error instanceof StoryNarrationUpstreamError) {
      return errorResponse(error.code, error.message, error.status);
    }

    if (error instanceof StoryNarrationPipelineError) {
      return errorResponse(error.code, error.message, error.status);
    }

    console.error("Unexpected error while processing story narration.", {
      requestId,
      storyId: story.id,
      appUserId: appUser.id,
      message: error instanceof Error ? error.message : "Unknown error"
    });

    return errorResponse("internal_error", "Unable to process story narration.", 500);
  }
}

async function getAuthenticatedAppUser(
  supabase: SupabaseClient
): Promise<
  | { appUser: AppUser; response: null }
  | { appUser: null; response: NextResponse<StoryNarrationErrorBody> }
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
    console.error("Failed to resolve authenticated application user for narration.", {
      authId: user.id,
      code: appUserError.code
    });

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

  return {
    appUser: {
      id: appUserRow.id,
      authId: appUserRow.auth_id,
      role
    },
    response: null
  };
}

function buildSupabaseNarrationDeps({
  admin,
  requestId,
  appUserId
}: {
  admin: SupabaseClient;
  requestId: string;
  appUserId: string;
}) {
  return {
    async findCachedNarration({
      storyId,
      narrationVersion
    }: {
      storyId: string;
      narrationVersion: string;
    }) {
      const { data, error } = await admin
        .from("story_narrations")
        .select("id, story_id, audio_path, mime_type, duration_seconds, word_timestamps, text_hash, narration_version")
        .eq("story_id", storyId)
        .eq("narration_version", narrationVersion)
        .maybeSingle<StoryNarrationRecord>();

      if (error) {
        console.error("Failed to read cached story narration.", {
          requestId,
          storyId,
          appUserId,
          code: error.code
        });

        throw new StoryNarrationPipelineError(
          "persistence_failed",
          "Unable to read cached narration.",
          500
        );
      }

      return data;
    },
    async signAudioUrl({
      bucket,
      audioPath,
      ttlSeconds
    }: {
      bucket: string;
      audioPath: string;
      ttlSeconds: number;
    }) {
      const { data, error } = await admin.storage
        .from(bucket)
        .createSignedUrl(audioPath, ttlSeconds);

      if (error || !data?.signedUrl) {
        console.error("Failed to create signed story narration URL.", {
          requestId,
          appUserId,
          bucket,
          code: error?.name
        });

        throw new StoryNarrationPipelineError(
          "storage_failed",
          "Unable to create a signed narration URL.",
          500
        );
      }

      return {
        audioUrl: data.signedUrl,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString()
      };
    },
    narrateStory: narrateStoryText,
    async uploadAudio({
      bucket,
      audioPath,
      bytes,
      mimeType
    }: {
      bucket: string;
      audioPath: string;
      bytes: Buffer;
      mimeType: SupportedNarrationMimeType;
    }) {
      const { error } = await admin.storage
        .from(bucket)
        .upload(audioPath, bytes, {
          contentType: mimeType,
          upsert: true
        });

      if (error) {
        console.error("Failed to upload story narration audio.", {
          requestId,
          appUserId,
          bucket,
          code: error.name
        });

        throw new StoryNarrationPipelineError(
          "storage_failed",
          "Unable to store narration audio.",
          500
        );
      }
    },
    async saveNarration(record: StoryNarrationRecord) {
      const { data, error } = await admin
        .from("story_narrations")
        .upsert(record, {
          onConflict: "story_id,narration_version"
        })
        .select("id, story_id, audio_path, mime_type, duration_seconds, word_timestamps, text_hash, narration_version")
        .single<StoryNarrationRecord>();

      if (error) {
        console.error("Failed to save story narration metadata.", {
          requestId,
          storyId: record.story_id,
          appUserId,
          code: error.code
        });

        throw new StoryNarrationPipelineError(
          "persistence_failed",
          "Unable to save narration metadata.",
          500
        );
      }

      return data;
    },
    async listObsoleteNarrations({
      storyId,
      keepNarrationVersion
    }: {
      storyId: string;
      keepNarrationVersion: string;
    }) {
      const { data, error } = await admin
        .from("story_narrations")
        .select("id, story_id, audio_path, mime_type, duration_seconds, word_timestamps, text_hash, narration_version")
        .eq("story_id", storyId)
        .neq("narration_version", keepNarrationVersion);

      if (error) {
        console.warn("Failed to list obsolete story narrations.", {
          requestId,
          storyId,
          appUserId,
          code: error.code
        });

        return [];
      }

      return data ?? [];
    },
    async deleteNarrations({ ids }: { ids: string[] }) {
      if (ids.length === 0) {
        return;
      }

      const { error } = await admin.from("story_narrations").delete().in("id", ids);

      if (error) {
        console.warn("Failed to delete obsolete story narration metadata.", {
          requestId,
          appUserId,
          count: ids.length,
          code: error.code
        });
      }
    },
    async removeAudioObjects({ bucket, paths }: { bucket: string; paths: string[] }) {
      if (paths.length === 0) {
        return;
      }

      const { error } = await admin.storage.from(bucket).remove(paths);

      if (error) {
        console.warn("Failed to remove obsolete story narration audio.", {
          requestId,
          appUserId,
          bucket,
          count: paths.length,
          code: error.name
        });
      }
    },
    logger: console
  };
}

function errorResponse(code: StoryNarrationErrorCode, message: string, status: number) {
  return NextResponse.json<StoryNarrationErrorBody>({ error: { code, message } }, { status });
}
