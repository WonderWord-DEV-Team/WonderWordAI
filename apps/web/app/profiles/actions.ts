"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";
import { gradeFromAge, normalizeReadingLevel, generateSyntheticChildEmail } from "@/lib/child/profileHelpers";

export type StartChildSessionResult = { success: boolean; error?: string };

export async function startChildSession(childId: string): Promise<StartChildSessionResult> {
  if (!hasSupabaseAdminEnv()) {
    return { success: false, error: "Not configured on the server." };
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const admin = createAdminClient();

  const { data: parentRow, error: parentError } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .eq("role", "PARENT")
    .single();

  if (parentError || !parentRow) {
    return { success: false, error: "Only parent accounts can switch profiles." };
  }

  const { data: link, error: linkError } = await admin
    .from("parent_child")
    .select("child_id")
    .eq("parent_id", parentRow.id)
    .eq("child_id", childId)
    .maybeSingle();

  if (linkError || !link) {
    return { success: false, error: "You are not authorized to access this profile." };
  }

  const { data: childUser, error: childUserError } = await admin
    .from("users")
    .select("email")
    .eq("id", childId)
    .eq("role", "CHILD")
    .single();

  if (childUserError || !childUser?.email) {
    console.error("child lookup failed:", childUserError?.message);
    return { success: false, error: "Could not find this child's account." };
  }

  // Stash the parent's current session BEFORE we overwrite it below, so the
  // "back to parent" button can restore it without a fresh login.
  const {
    data: { session: parentSession }
  } = await supabase.auth.getSession();

  if (parentSession) {
    cookies().set(
      "parent_session",
      JSON.stringify({
        access_token: parentSession.access_token,
        refresh_token: parentSession.refresh_token
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 4
      }
    );
  }

  const { data: magicLink, error: linkGenError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: childUser.email
  });

  if (linkGenError || !magicLink?.properties?.hashed_token) {
    console.error("generateLink failed:", linkGenError?.message);
    return { success: false, error: "Could not start the child's session." };
  }

  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: magicLink.properties.hashed_token,
    type: "magiclink"
  });

  if (verifyError) {
    console.error("verifyOtp failed:", verifyError.message);
    return { success: false, error: "Could not start the child's session." };
  }

  return { success: true };
}

export type SwitchProfileResult = { success: boolean; error?: string };

export async function switchToParent(): Promise<SwitchProfileResult> {
  const cookieStore = cookies();
  const stashed = cookieStore.get("parent_session")?.value;

  if (!stashed) {
    return { success: false, error: "No parent session found. Please log in again." };
  }

  let parsed: { access_token: string; refresh_token: string };
  try {
    parsed = JSON.parse(stashed);
  } catch {
    return { success: false, error: "Could not restore your session. Please log in again." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.setSession(parsed);

  if (error) {
    console.error("switchToParent setSession failed:", error.message);
    return { success: false, error: "Could not restore your session. Please log in again." };
  }

  cookieStore.delete("parent_session");
  return { success: true };
}

export async function switchToSibling(targetChildId: string): Promise<SwitchProfileResult> {
  if (!hasSupabaseAdminEnv()) {
    return { success: false, error: "Not configured on the server." };
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const admin = createAdminClient();

  const { data: currentChild } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .eq("role", "CHILD")
    .single();

  if (!currentChild) {
    return { success: false, error: "Not a child session." };
  }

  const { data: parentLink } = await admin
    .from("parent_child")
    .select("parent_id")
    .eq("child_id", currentChild.id)
    .maybeSingle();

  if (!parentLink) {
    return { success: false, error: "Could not find your family account." };
  }

  const { data: siblingLink } = await admin
    .from("parent_child")
    .select("child_id")
    .eq("parent_id", parentLink.parent_id)
    .eq("child_id", targetChildId)
    .maybeSingle();

  if (!siblingLink) {
    return { success: false, error: "This profile is not part of your family." };
  }

  const { data: targetUser } = await admin
    .from("users")
    .select("email")
    .eq("id", targetChildId)
    .eq("role", "CHILD")
    .single();

  if (!targetUser?.email) {
    return { success: false, error: "Could not find this child's account." };
  }

  const { data: magicLink, error: linkGenError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: targetUser.email
  });

  if (linkGenError || !magicLink?.properties?.hashed_token) {
    console.error("switchToSibling generateLink failed:", linkGenError?.message);
    return { success: false, error: "Could not switch profiles." };
  }

  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: magicLink.properties.hashed_token,
    type: "magiclink"
  });

  if (verifyError) {
    console.error("switchToSibling verifyOtp failed:", verifyError.message);
    return { success: false, error: "Could not switch profiles." };
  }

  return { success: true };
}

export type AddChildInput = {
  nickname: string;
  age: string;
  readingLevel: string;
};

export type AddChildResult = { success: boolean; error?: string };

export async function addChildProfile(input: AddChildInput): Promise<AddChildResult> {
  if (!hasSupabaseAdminEnv()) {
    return { success: false, error: "Not configured on the server." };
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const admin = createAdminClient();

  const { data: parentRow, error: parentError } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .eq("role", "PARENT")
    .single();

  if (parentError || !parentRow) {
    return { success: false, error: "Only parent accounts can add a child." };
  }

  const nickname = input.nickname.trim();
  const age = Number.parseInt(input.age, 10);

  if (!nickname || Number.isNaN(age)) {
    return { success: false, error: "Please provide a name and age." };
  }

  const readingLevel = normalizeReadingLevel(input.readingLevel);
  const syntheticEmail = generateSyntheticChildEmail();
  const randomPassword = crypto.randomUUID() + crypto.randomUUID();

  const { data: newAuthUser, error: createError } = await admin.auth.admin.createUser({
    email: syntheticEmail,
    password: randomPassword,
    email_confirm: true
  });

  if (createError || !newAuthUser.user) {
    console.error("addChildProfile createUser failed:", createError?.message);
    return { success: false, error: "Could not create the child's account." };
  }

  const { data: childRow, error: childInsertError } = await admin
    .from("users")
    .insert({
      auth_id: newAuthUser.user.id,
      email: syntheticEmail,
      role: "CHILD"
    })
    .select("id")
    .single();

  if (childInsertError || !childRow) {
    console.error("addChildProfile users insert failed:", childInsertError?.message);
    return { success: false, error: "Could not finish creating the child's profile." };
  }

  const { error: profileError } = await admin.from("child_profiles").insert({
    child_id: childRow.id,
    name: nickname,
    age,
    grade: gradeFromAge(age),
    reading_level: readingLevel
  });

  if (profileError) {
    console.error("addChildProfile child_profiles insert failed:", profileError.message);
    return { success: false, error: "Could not save the child's reading profile." };
  }

  const { error: linkError } = await admin.from("parent_child").insert({
    parent_id: parentRow.id,
    child_id: childRow.id
  });

  if (linkError) {
    console.error("addChildProfile parent_child insert failed:", linkError.message);
    return { success: false, error: "Could not link the child to your account." };
  }

  return { success: true };
}