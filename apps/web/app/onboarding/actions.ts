"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";
import { gradeFromAge, normalizeReadingLevel, generateSyntheticChildEmail } from "@/lib/child/profileHelpers";
import type { OnboardingData } from "@/components/onboarding/OnboardingContext";

export type ChildCreationResult = {
  nickname: string;
  success: boolean;
  error?: string;
};

export type CompleteOnboardingResult =
  | { success: true; children: ChildCreationResult[] }
  | { success: false; error: string };

export async function completeOnboarding(
  data: OnboardingData
): Promise<CompleteOnboardingResult> {
  if (!hasSupabaseAdminEnv()) {
    return {
      success: false,
      error: "Onboarding is not configured on the server. Please contact support."
    };
  }

  const parentName = data.parentName.trim();
  const parentEmail = data.parentEmail.trim().toLowerCase();
  const password = data.password;

  if (!parentName || !parentEmail || !password) {
    return { success: false, error: "Please fill in your name, email, and password." };
  }

  const supabase = createClient();

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: parentEmail,
    password
  });

  if (signUpError || !signUpData.user) {
    return {
      success: false,
      error: signUpError?.message || "We couldn't create your account. Please try again."
    };
  }

  const admin = createAdminClient();

  const { error: parentInsertError } = await admin.from("users").insert({
    auth_id: signUpData.user.id,
    email: parentEmail,
    name: parentName,
    role: "PARENT"
  });

  if (parentInsertError) {
    console.error("parent users insert failed:", parentInsertError.message);
    return {
      success: false,
      error: "Your account was created, but we couldn't finish setting it up. Please contact support."
    };
  }

  const { data: parentRow, error: parentLookupError } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", signUpData.user.id)
    .single();

  if (parentLookupError || !parentRow) {
    console.error("parent users lookup failed:", parentLookupError?.message);
    return {
      success: false,
      error: "Your account was created, but we couldn't finish setting it up. Please contact support."
    };
  }

  const results: ChildCreationResult[] = [];

  for (const child of data.children) {
    const nickname = child.nickname.trim();

    try {
      const age = Number.parseInt(child.age, 10);
      if (!nickname || Number.isNaN(age)) {
        throw new Error("Missing name or age.");
      }

      const readingLevel = normalizeReadingLevel(child.readingLevel);
      const syntheticEmail = generateSyntheticChildEmail();
      const randomPassword = crypto.randomUUID() + crypto.randomUUID();

      const { data: newAuthUser, error: createError } = await admin.auth.admin.createUser({
        email: syntheticEmail,
        password: randomPassword,
        email_confirm: true
      });

      if (createError || !newAuthUser.user) {
        console.error("child auth createUser failed:", createError?.message);
        throw new Error(createError?.message || "Could not create the child's account.");
      }

      const { data: childUserRow, error: childUserInsertError } = await admin
        .from("users")
        .insert({
          auth_id: newAuthUser.user.id,
          email: syntheticEmail,
          role: "CHILD"
        })
        .select("id")
        .single();

      if (childUserInsertError || !childUserRow) {
        console.error("child users insert failed:", childUserInsertError?.message);
        throw new Error(childUserInsertError?.message || "Could not finish creating the child's profile.");
      }

      const { error: profileError } = await admin.from("child_profiles").insert({
        child_id: childUserRow.id,
        name: nickname,
        age,
        grade: gradeFromAge(age),
        reading_level: readingLevel
      });

      if (profileError) {
        console.error("child_profiles insert failed:", profileError.message);
        throw new Error(`Could not save the child's reading profile: ${profileError.message}`);
      }

      const { error: linkError } = await admin.from("parent_child").insert({
        parent_id: parentRow.id,
        child_id: childUserRow.id
      });

      if (linkError) {
        console.error("parent_child insert failed:", linkError.message);
        throw new Error(`Could not link the child to your account: ${linkError.message}`);
      }

      results.push({ nickname: nickname || "Unnamed", success: true });
    } catch (err) {
      results.push({
        nickname: nickname || "Unnamed",
        success: false,
        error: err instanceof Error ? err.message : "Unknown error."
      });
    }
  }

  return { success: true, children: results };
}

export async function checkParentEmailAvailable(
  email: string
): Promise<{ available: boolean; error?: string }> {
  if (!hasSupabaseAdminEnv()) {
    return { available: true };
  }

  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return { available: true };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers();

  if (error) {
    console.error("checkParentEmailAvailable listUsers failed:", error.message);
    return { available: true };
  }

  const taken = data.users.some((u) => u.email?.toLowerCase() === normalized);
  return { available: !taken };
}