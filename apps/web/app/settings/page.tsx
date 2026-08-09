import { cookies } from "next/headers";
import { requireRole } from "@/lib/auth/server";
import { getE2eAuthState, isE2eMode } from "@/lib/e2e/fixtures";
import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";

async function getParentName(fallbackEmail: string): Promise<string> {
  if (isE2eMode()) {
    const auth = getE2eAuthState(cookies());
    return auth.status === "authenticated" ? auth.appUser.name : fallbackEmail;
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return fallbackEmail;
  }

  const { data: parentUser } = await supabase
    .from("users")
    .select("name")
    .eq("auth_id", user.id)
    .eq("role", "PARENT")
    .single();

  return parentUser?.name ?? fallbackEmail;
}

export default async function SettingsPage() {
  const auth = await requireRole("PARENT");
  const parentName = await getParentName(auth.email);

  return <SettingsClient parentName={parentName} />;
}
