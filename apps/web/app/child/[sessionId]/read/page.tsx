import type { Metadata } from "next";
import { ChildReadingShell } from "@/components/child/ChildReadingShell";
import { requireRole } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Reading Session"
};

export const dynamic = "force-dynamic";

type ChildReadPageProps = {
  params: {
    sessionId: string;
  };
};

export default async function ChildReadPage({ params }: ChildReadPageProps) {
  const auth = await requireRole("CHILD");
  return <ChildReadingShell auth={auth} routeSessionId={params.sessionId} />;
}
