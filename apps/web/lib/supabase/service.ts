import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Service-role client — bypasses Row Level Security entirely. Only use this
 * from trusted server contexts with no logged-in user in scope, like the
 * Stripe webhook. Never import this from a "use client" component or from
 * anything that runs with a user's request context (use lib/supabase/server.ts
 * createClient() for that instead).
 */
export function createServiceClient() {
  const { url } = getSupabaseEnv(); // URL is public info, safe to reuse

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable.");
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
