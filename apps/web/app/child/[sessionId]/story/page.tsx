import { cookies } from "next/headers";
import { getE2eAuthState, isE2eMode } from "@/lib/e2e/fixtures";
import { requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { StoryClient } from "./StoryClient";

export const dynamic = "force-dynamic";

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

export default async function ThemedStoryPage() {
  await requireRole("CHILD");
  const childName = await getChildName();

  return <StoryClient childName={childName} />;
}
