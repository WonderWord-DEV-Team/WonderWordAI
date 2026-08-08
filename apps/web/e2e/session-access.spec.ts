import { test, expect } from "@playwright/test";
import {
  blockExternalRequests,
  e2eAuthIds,
  e2eIds,
  resetFixtures,
  signIn
} from "./helpers";

test.beforeEach(async ({ page, request }) => {
  await resetFixtures(request);
  await blockExternalRequests(page);
});

test("allows child to open their active session", async ({ page, context }) => {
  await signIn(context, e2eAuthIds.childOne);

  await page.goto(`/child/${e2eIds.openSession}/read`);

  await expect(page.getByText("Reading Mode")).toBeVisible();
  await expect(page.getByText("Worksheet text is no longer available")).toBeVisible();
});

test("blocks access to another child's session", async ({ page, context }) => {
  await signIn(context, e2eAuthIds.childOne);

  await page.goto(`/child/${e2eIds.otherChildSession}/read`);

  await expect(page.getByText("This reading session is not available.")).toBeVisible();
  await expect(page.getByText("E2E Child Two")).toHaveCount(0);
});

test("handles a nonexistent session", async ({ page, context }) => {
  await signIn(context, e2eAuthIds.childOne);

  await page.goto("/child/40000000-0000-4000-8000-000000009999/read");

  await expect(page.getByText("This reading session is not available.")).toBeVisible();
});

test("handles malformed session ID", async ({ page, context }) => {
  await signIn(context, e2eAuthIds.childOne);

  await page.goto("/child/not-a-session/read");

  await expect(page.getByText("This reading session link is invalid.")).toBeVisible();
});

test("handles closed session", async ({ page, context }) => {
  await signIn(context, e2eAuthIds.childOne);

  await page.goto(`/child/${e2eIds.closedSession}/read`);

  await expect(page.getByText("This reading session is already closed.")).toBeVisible();
});

test("supports direct navigation", async ({ page, context }) => {
  await signIn(context, e2eAuthIds.childOne);

  await page.goto(`/child/${e2eIds.openSession}/read`);

  await expect(page.getByText("Reading Mode")).toBeVisible();
  await expect(page.getByText("Worksheet text is no longer available")).toBeVisible();
});

test("handles refresh intentionally", async ({ page, context }) => {
  await signIn(context, e2eAuthIds.childOne);
  await page.goto(`/child/${e2eIds.openSession}/read`);

  await page.reload();

  await expect(page.getByText("Worksheet text is no longer available")).toBeVisible();
});

test("clears stale state when navigating between sessions", async ({ page, context }) => {
  await signIn(context, e2eAuthIds.childOne);
  await page.goto(`/child/${e2eIds.openSession}/read`);
  await expect(page.getByText("Worksheet text is no longer available")).toBeVisible();

  await page.goto(`/child/${e2eIds.closedSession}/read`);

  await expect(page.getByText("This reading session is already closed.")).toBeVisible();
});

test("prevents duplicate session creation", async ({ page, context }) => {
  await signIn(context, e2eAuthIds.childOne);
  await page.goto("/child");

  await page.locator("#worksheet-image").setInputFiles({
    name: "synthetic-worksheet.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      "base64"
    )
  });
  const scanButton = page.getByRole("button", { name: "Scan worksheet" });

  await Promise.all([scanButton.click(), scanButton.click({ force: true }).catch(() => null)]);
  await expect(page).toHaveURL(/\/child\/50000000-0000-4000-8000-000000000001\/read$/);

  const sessions = await page.evaluate(async () => {
    const response = await fetch("/api/sessions?status=open&limit=100");
    return response.json();
  });

  expect(sessions.sessions.filter((session: { id: string }) => session.id.startsWith("50000000"))).toHaveLength(1);
});

test("safely handles the same session in a second tab", async ({ context }) => {
  await signIn(context, e2eAuthIds.childOne);
  const first = await context.newPage();
  const second = await context.newPage();
  await blockExternalRequests(first);
  await blockExternalRequests(second);

  await first.goto(`/child/${e2eIds.openSession}/read`);
  await second.goto(`/child/${e2eIds.openSession}/read`);

  await expect(first.getByText("Worksheet text is no longer available")).toBeVisible();
  await expect(second.getByText("Worksheet text is no longer available")).toBeVisible();
});

test("supports browser back and forward navigation", async ({ page, context }) => {
  await signIn(context, e2eAuthIds.childOne);
  await page.goto(`/child/${e2eIds.openSession}/read`);
  await expect(page.getByText("Worksheet text is no longer available")).toBeVisible();

  await page.goto(`/child/${e2eIds.closedSession}/read`);
  await expect(page.getByText("This reading session is already closed.")).toBeVisible();

  await page.goBack();
  await expect(page.getByText("Worksheet text is no longer available")).toBeVisible();

  await page.goForward();
  await expect(page.getByText("This reading session is already closed.")).toBeVisible();
});
