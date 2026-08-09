import { getHeaderAuthState } from "@/lib/auth/server";
import { HelpClient } from "./HelpClient";

export const dynamic = "force-dynamic";

export default async function HelpFaqPage() {
  const headerAuth = await getHeaderAuthState();

  return <HelpClient headerAuth={headerAuth} />;
}
