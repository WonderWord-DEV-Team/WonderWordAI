import type { Metadata } from "next";
import { ParentDashboardShell } from "@/components/parent/ParentDashboardShell";
import { getAuthContext, requireRole } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Parent Dashboard"
};

export const dynamic = "force-dynamic";

export default async function ParentDashboardPage() {
  const auth = await getAuthContext();

  if (!auth) {
    redirect("/auth/login");
  }

  if (auth.role !== "PARENT") {
    redirect(auth.role === "CHILD" ? "/child" : "/auth/login");
  }

  return <ParentDashboardShell auth={auth} />;
}
