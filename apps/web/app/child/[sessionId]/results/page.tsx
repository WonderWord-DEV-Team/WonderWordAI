import type { Metadata } from "next";
import { ReadingResultsShell } from "@/components/child/ReadingResultsShell";
import { requireRole } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Reading Results"
};

export const dynamic = "force-dynamic";

export default async function ChildResultsPage() {
  const auth = await requireRole("CHILD");
  return <ReadingResultsShell auth={auth} />;
}
