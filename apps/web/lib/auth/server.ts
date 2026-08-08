import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getE2eAuthContext, getE2eAuthState, isE2eMode } from "@/lib/e2e/fixtures";
import { getRoleHome, parseUserRole, type AuthContext, type UserRole } from "@/lib/auth/types";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function getAuthContext(): Promise<AuthContext | null> {
  if (isE2eMode()) {
    return getE2eAuthContext(getE2eAuthState(cookies()));
  }

  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    return null;
  }

  const claimsRole = parseUserRole((userData.user as { user_role?: string } | undefined)?.user_role);
  const fallbackRole = claimsRole ?? (await getRoleFromProfile(supabase, userData.user.id));

  if (!fallbackRole) {
    return null;
  }

  return {
    email: userData.user.email ?? "Signed-in user",
    role: fallbackRole
  };
}

async function getRoleFromProfile(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("role")
    .eq("auth_id", userId)
    .maybeSingle<{ role: string }>();

  if (error || !data?.role) {
    return null;
  }

  return parseUserRole(data.role);
}

export async function requireRole(role: UserRole): Promise<AuthContext> {
  const auth = await getAuthContext();

  if (!auth) {
    redirect("/auth/login");
  }

  if (auth.role !== role) {
    redirect(getRoleHome(auth.role));
  }

  return auth;
}
