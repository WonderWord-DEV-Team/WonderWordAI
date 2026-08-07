"use client";

import { ChildSessionProvider } from "@/components/child/ChildSessionContext";
import type { AuthContext } from "@/lib/auth/types";
import ReadingModeDashboard from "./ReadingModeDashboard";

type ReadingModeClientProps = {
  auth: AuthContext;
};

export default function ReadingModeClient({ auth }: ReadingModeClientProps) {
  return (
    <ChildSessionProvider sessionId="pending">
      <ReadingModeDashboard auth={auth} />
    </ChildSessionProvider>
  );
}
