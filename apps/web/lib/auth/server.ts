import { redirect } from "next/navigation";
import { getRoleHome, parseUserRole, type AuthContext, type UserRole } from "@/lib/auth/types";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function getAuthContext(): Promise<AuthContext | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return null;
  }

  const role = parseUserRole(data.claims.user_role);

  if (!role) {
    await supabase.auth.signOut();
    return null;
  }

  return {
    email: data.claims.email ?? "Signed-in user",
    role
  };
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
