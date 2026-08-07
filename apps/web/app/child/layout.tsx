import type { ReactNode } from "react";
import { ChildSessionProvider } from "@/components/child/ChildSessionContext";
import { requireRole } from "@/lib/auth/server";

export default async function ChildLayout({ children }: { children: ReactNode }) {
  await requireRole("CHILD");

  return (
    <ChildSessionProvider sessionId="pending">
      {children}
    </ChildSessionProvider>
  );
}