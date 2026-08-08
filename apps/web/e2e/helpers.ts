import { expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import {
  E2E_AUTH_COOKIE,
  E2E_AUTH_SECRET,
  e2eAuthIds,
  e2eIds,
  e2eWorksheetText,
  makeE2eAuthCookie
} from "@/lib/e2e/fixtures";

export { e2eAuthIds, e2eIds, e2eWorksheetText };

export const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";

const blockedHostPatterns = [
  "tvcbdhekuzwljabbqfgc.supabase.co",
  "api.openai.com",
  "api.anthropic.com",
  "api.unsplash.com",
  "images.unsplash.com",
  "vision.googleapis.com",
  "stripe.com",
  "api.stripe.com",
  "twilio.com",
  "vercel.app"
];

export async function resetFixtures(request: APIRequestContext) {
  const response = await request.post("/api/e2e/reset", {
    headers: { "x-wonderword-e2e-secret": E2E_AUTH_SECRET }
  });

  expect(response.ok()).toBeTruthy();
}

export async function signIn(context: BrowserContext, authId: string) {
  const cookieValue = makeE2eAuthCookie(authId);
  await context.addCookies([
    {
      name: E2E_AUTH_COOKIE,
      value: cookieValue,
      url: baseURL,
      sameSite: "Lax"
    },
    {
      name: E2E_AUTH_COOKIE,
      value: cookieValue,
      url: baseURL.replace("127.0.0.1", "localhost"),
      sameSite: "Lax"
    }
  ]);
}

export function authHeaders(authId: string) {
  return {
    Cookie: `${E2E_AUTH_COOKIE}=${makeE2eAuthCookie(authId)}`
  };
}

export async function blockExternalRequests(page: Page) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const isLocal =
      url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.protocol === "data:";

    if (!isLocal && blockedHostPatterns.some((pattern) => url.hostname.includes(pattern))) {
      throw new Error(`Blocked external E2E request to ${url.hostname}`);
    }

    await route.continue();
  });
}

export function syntheticWorksheetFile() {
  return {
    name: "synthetic-worksheet.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      "base64"
    )
  };
}
