import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ChildReadingShell } from "@/components/child/ChildReadingShell";
import { requireRole } from "@/lib/auth/server";
import { getE2eAuthState, isE2eMode } from "@/lib/e2e/fixtures";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Reading Session"
};

export const dynamic = "force-dynamic";

type ChildReadPageProps = {
  params: {
    sessionId: string;
  };
};

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

export default async function ChildReadPage({ params }: ChildReadPageProps) {
  await requireRole("CHILD");
  const childName = await getChildName();

  return <ChildReadingShell childName={childName} routeSessionId={params.sessionId} />;
}
