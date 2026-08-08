import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function hasSupabaseAdminEnv() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createAdminClient() {
  const { url } = getSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Ephemeral, non-persisting client — used ONLY to call signInAnonymously()
 * to properly provision an anonymous auth user (is_anonymous: true).
 * Its session is discarded immediately; it never touches browser cookies,
 * so it can't clobber whatever session (e.g. the parent's) is active.
 */
export function createEphemeralAnonClient() {
  const { url, publishableKey } = getSupabaseEnv();

  return createSupabaseClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}