"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";
import { isE2eMode } from "@/lib/e2e/fixtures";

/**
 * Records that a child actually finished an activity.
 *
 * This is the only writer of public.child_activity_events. Progress used to be
 * inferred from reading_sessions (created when an activity *starts*, and reused
 * for the whole visit) and generated_stories (never written by any child-facing
 * flow), which meant Today's Goal counted almost nothing. Completion is now an
 * explicit event, emitted from the point in each flow where the child is
 * genuinely done.
 */

export type ActivityType = "themed_story" | "read_aloud" | "worksheet";

const ACTIVITY_TYPES: ActivityType[] = ["themed_story", "read_aloud", "worksheet"];

export type RecordActivityResult = { success: boolean; error?: string };

function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** YYYY-MM-DD in the given IANA zone. */
export async function localDateIn(timeZone: string, at: Date = new Date()) {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(at);
}

async function resolveChildId() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const admin = createAdminClient();
  const { data: childUser } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .eq("role", "CHILD")
    .maybeSingle();

  return childUser?.id ?? null;
}

/**
 * Stores the browser's IANA time zone on the child profile so the server can
 * resolve the child's own calendar day. Without it streaks and daily goals roll
 * over at UTC midnight — 21:00 in Brazil, 16:00 US Pacific.
 */
export async function saveChildTimezone(timeZone: string): Promise<RecordActivityResult> {
  if (isE2eMode()) return { success: true };
  if (!hasSupabaseAdminEnv()) return { success: false, error: "Not configured." };
  if (typeof timeZone !== "string" || !isValidTimeZone(timeZone)) {
    return { success: false, error: "Unknown time zone." };
  }

  const childId = await resolveChildId();
  if (!childId) return { success: false, error: "Not signed in as a child." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("child_profiles")
    .update({ timezone: timeZone })
    .eq("child_id", childId);

  if (error) {
    console.error("Failed to save child timezone:", error);
    return { success: false, error: "Could not save time zone." };
  }

  return { success: true };
}

export async function recordActivityCompletion(input: {
  activityType: ActivityType;
  theme?: string | null;
}): Promise<RecordActivityResult> {
  if (isE2eMode()) return { success: true };
  if (!hasSupabaseAdminEnv()) return { success: false, error: "Not configured." };

  if (!ACTIVITY_TYPES.includes(input.activityType)) {
    return { success: false, error: "Unknown activity type." };
  }

  const childId = await resolveChildId();
  if (!childId) return { success: false, error: "Not signed in as a child." };

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("child_profiles")
    .select("timezone")
    .eq("child_id", childId)
    .maybeSingle();

  const timeZone =
    profile?.timezone && isValidTimeZone(profile.timezone) ? profile.timezone : "UTC";

  const theme =
    input.activityType === "themed_story" && input.theme
      ? input.theme.toLowerCase().slice(0, 40)
      : null;

  const { error } = await admin.from("child_activity_events").insert({
    child_id: childId,
    activity_type: input.activityType,
    theme,
    local_date: await localDateIn(timeZone)
  });

  if (error) {
    console.error("Failed to record activity completion:", error);
    return { success: false, error: "Could not record activity." };
  }

  return { success: true };
}
