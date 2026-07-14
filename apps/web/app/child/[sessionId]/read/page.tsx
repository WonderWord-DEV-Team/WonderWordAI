import type { Metadata } from "next";
import { ChildReadingShell } from "@/components/child/ChildReadingShell";
import { ChildSessionProvider } from "@/components/child/ChildSessionContext";
import { requireRole } from "@/lib/auth/server";

type ChildReadPageProps = {
  params: {
    sessionId: string;
  };
};

export const metadata: Metadata = {
  title: "Reading Session"
};

export const dynamic = "force-dynamic";

export default async function ChildReadPage({ params }: ChildReadPageProps) {
  const auth = await requireRole("CHILD");

  return (
    <ChildSessionProvider sessionId={params.sessionId}>
      <ChildReadingShell auth={auth} />
    </ChildSessionProvider>
  );
}
