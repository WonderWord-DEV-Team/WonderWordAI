import type { Metadata } from "next";
import { ParentDashboardShell } from "@/components/parent/ParentDashboardShell";
import { requireRole } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Parent Dashboard"
};

export const dynamic = "force-dynamic";

export default async function ParentDashboardPage() {
  const auth = await requireRole("PARENT");

  return <ParentDashboardShell auth={auth} />;
}
