import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExplorerClient } from "./ExplorerClient";

export const dynamic = "force-dynamic";

export default async function WordExplorerPage() {
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

  return <ExplorerClient childName={profile?.name ?? "Reader"} />;
}
