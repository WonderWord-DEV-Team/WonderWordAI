import { NextRequest, NextResponse } from "next/server";
import { E2E_AUTH_SECRET, isE2eMode, resetE2eStore } from "@/lib/e2e/fixtures";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isE2eMode()) {
    return NextResponse.json({ error: "not_found", message: "Not found." }, { status: 404 });
  }

  if (request.headers.get("x-wonderword-e2e-secret") !== E2E_AUTH_SECRET) {
    return NextResponse.json({ error: "unauthorized", message: "Authentication is required." }, { status: 401 });
  }

  resetE2eStore();
  return NextResponse.json({ ok: true });
}
