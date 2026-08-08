import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  getE2eAuthState,
  getE2eChildProfile,
  getE2eLinkedChildIds,
  isE2eMode
} from "@/lib/e2e/fixtures";
import { createClient } from "@/lib/supabase/server";
import { ProfileGrid } from "./ProfileGrid";

export const dynamic = "force-dynamic";

export default async function ChooseProfilePage() {
  if (isE2eMode()) {
    const auth = getE2eAuthState(cookies());
    if (auth.status !== "authenticated" || auth.appUser.role !== "PARENT") {
      redirect("/auth/login");
    }

    const profiles = getE2eLinkedChildIds(auth.appUser.id)
      .map(getE2eChildProfile)
      .filter((profile): profile is NonNullable<ReturnType<typeof getE2eChildProfile>> =>
        Boolean(profile)
      );

    return <ProfileGrid profiles={profiles} />;
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: parentRow } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .eq("role", "PARENT")
    .single();

  if (!parentRow) {
    redirect("/auth/login");
  }

  const { data: links } = await supabase
    .from("parent_child")
    .select("child_id")
    .eq("parent_id", parentRow.id);

  const childIds = (links ?? []).map((l) => l.child_id);

  const { data: profiles } = childIds.length
    ? await supabase.from("child_profiles").select("child_id, name, grade").in("child_id", childIds)
    : { data: [] };

  return <ProfileGrid profiles={profiles ?? []} />;
}
