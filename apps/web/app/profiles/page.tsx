import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileGrid } from "./ProfileGrid";

export const dynamic = "force-dynamic";

export default async function ChooseProfilePage() {
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