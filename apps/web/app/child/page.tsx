import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  getE2eAuthState,
  getE2eChildProfile,
  getE2eSiblingProfiles,
  isE2eMode
} from "@/lib/e2e/fixtures";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ChildHomeClient } from "./ChildHomeClient";

export const dynamic = "force-dynamic";

export default async function ChildHomePage() {
  if (isE2eMode()) {
    const auth = getE2eAuthState(cookies());
    if (auth.status !== "authenticated" || auth.appUser.role !== "CHILD") {
      redirect("/auth/login");
    }

    const profile = getE2eChildProfile(auth.appUser.id);
    return (
      <ChildHomeClient
        childName={profile?.name ?? "Reader"}
        siblings={getE2eSiblingProfiles(auth.appUser.id)}
      />
    );
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: childUser } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .eq("role", "CHILD")
    .single();

  if (!childUser) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("child_profiles")
    .select("name")
    .eq("child_id", childUser.id)
    .single();

  const admin = createAdminClient();
  const { data: parentLink } = await admin
    .from("parent_child")
    .select("parent_id")
    .eq("child_id", childUser.id)
    .maybeSingle();

  let siblings: { child_id: string; name: string }[] = [];
  if (parentLink) {
    const { data: allLinks } = await admin
      .from("parent_child")
      .select("child_id")
      .eq("parent_id", parentLink.parent_id);

    const otherChildIds = (allLinks ?? [])
      .map((l) => l.child_id)
      .filter((id) => id !== childUser.id);

    if (otherChildIds.length > 0) {
      const { data: siblingProfiles } = await admin
        .from("child_profiles")
        .select("child_id, name")
        .in("child_id", otherChildIds);

      siblings = siblingProfiles ?? [];
    }
  }

  return <ChildHomeClient childName={profile?.name ?? "Reader"} siblings={siblings} />;
}
