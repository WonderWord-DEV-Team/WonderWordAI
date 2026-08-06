import type { Metadata } from "next";
import { ChildReadingShell } from "@/components/child/ChildReadingShell";
import { requireRole } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Reading Session"
};

export const dynamic = "force-dynamic";

export default async function ChildReadPage() {
  const auth = await requireRole("CHILD");
  return <ChildReadingShell auth={auth} />;
}