import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ReadAloudClient } from "@/components/child/ReadAloudClient";
import { requireRole } from "@/lib/auth/server";
import { getE2eAuthState, isE2eMode } from "@/lib/e2e/fixtures";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Read Aloud"
};

export const dynamic = "force-dynamic";

// Same lookup as app/child/[sessionId]/read/page.tsx -- kept identical on
// purpose rather than reinvented, since the path from auth user to display
// name is non-obvious (auth.users.id -> users.id -> child_profiles.child_id)
// and the E2E fixture branch has to be handled the same way for tests to
// pass. If this ever changes, change it in both places.
async function getChildName(): Promise<string> {
  if (isE2eMode()) {
    const auth = getE2eAuthState(cookies());
    return auth.status === "authenticated" ? auth.appUser.name : "Reader";
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return "Reader";
  }

  const { data: childUser } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .eq("role", "CHILD")
    .single();

  if (!childUser) {
    return "Reader";
  }

  const { data: profile } = await supabase
    .from("child_profiles")
    .select("name")
    .eq("child_id", childUser.id)
    .single();

  return profile?.name ?? "Reader";
}

export default async function ReadAloudPage() {
  await requireRole("CHILD");
  const childName = await getChildName();

  return <ReadAloudClient childName={childName} />;
}