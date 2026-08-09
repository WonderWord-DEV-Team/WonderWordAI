"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getRoleHome, parseUserRole } from "@/lib/auth/types";
import { E2E_AUTH_COOKIE } from "@/lib/e2e/fixtures";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { LoginActionState } from "@/app/auth/login/state";
import type { ForgotPasswordActionState } from "@/app/auth/forgot-password/state";
import type { ResetPasswordActionState } from "@/app/auth/reset-password/state";

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

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    await supabase.auth.signOut();
    return {
      email,
      message: "We could not sign you in with those credentials."
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("auth_id", user.id)
    .single();

  const role = parseUserRole(profile?.role);

  if (profileError || !role) {
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

  cookies().delete("parent_session");
  cookies().delete(E2E_AUTH_COOKIE);
  redirect("/auth/login");
}

export async function requestPasswordReset(
  _previousState: ForgotPasswordActionState,
  formData: FormData
): Promise<ForgotPasswordActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!hasSupabaseEnv()) {
    return { email, success: false, message: "Supabase is not configured for this environment." };
  }
  if (!email) {
    return { email, success: false, message: "Enter your email address." };
  }

  const supabase = createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/reset-password`,
  });

  return { email, success: true, message: null };
}

export async function updatePassword(
  _previousState: ResetPasswordActionState,
  formData: FormData
): Promise<ResetPasswordActionState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!hasSupabaseEnv()) {
    return { success: false, message: "Supabase is not configured for this environment." };
  }
  if (password.length < 8) {
    return { success: false, message: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { success: false, message: "Passwords do not match." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { success: false, message: "We couldn't update your password. Try requesting a new reset link." };
  }

  return { success: true, message: null };
}
