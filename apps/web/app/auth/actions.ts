"use server";

import { redirect } from "next/navigation";
import { getRoleHome, parseUserRole } from "@/lib/auth/types";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { LoginActionState } from "@/app/auth/login/state";

export async function signInWithPassword(
  _previousState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!hasSupabaseEnv()) {
    return {
      email,
      message: "Supabase is not configured for this environment."
    };
  }

  if (!email || !password) {
    return {
      email,
      message: "Enter your email and password."
    };
  }

  const supabase = createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (signInError) {
    return {
      email,
      message: "We could not sign you in with those credentials."
    };
  }

  const { data, error: claimsError } = await supabase.auth.getClaims();
  const role = parseUserRole(data?.claims.user_role);

  if (claimsError || !data?.claims || !role) {
    await supabase.auth.signOut();
    return {
      email,
      message:
        "Your account is signed in, but it has not been provisioned with a valid role yet. Ask an administrator to finish setup."
    };
  }

  redirect(getRoleHome(role));
}

export async function signOut() {
  if (hasSupabaseEnv()) {
    const supabase = createClient();
    await supabase.auth.signOut();
  }

  redirect("/auth/login");
}
