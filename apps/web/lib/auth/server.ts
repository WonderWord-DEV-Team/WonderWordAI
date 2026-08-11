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

export type HeaderAuthState = { loggedIn: false } | { loggedIn: true; name: string };

// For public pages (Terms, Privacy, Help) that render a real name in the
// header when someone happens to be signed in, but must never redirect —
// unlike requireRole, an anonymous visitor is a valid state here.
export async function getHeaderAuthState(): Promise<HeaderAuthState> {
  if (!hasSupabaseEnv()) {
    return { loggedIn: false };
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { loggedIn: false };
  }

  const { data: appUser } = await supabase
    .from("users")
    .select("id, role, name")
    .eq("auth_id", user.id)
    .single();

  if (!appUser) {
    return { loggedIn: false };
  }

  if (appUser.role === "CHILD") {
    const { data: profile } = await supabase
      .from("child_profiles")
      .select("name")
      .eq("child_id", appUser.id)
      .single();

    return { loggedIn: true, name: profile?.name ?? "Reader" };
  }

  return { loggedIn: true, name: appUser.name ?? user.email ?? "Parent" };
}
