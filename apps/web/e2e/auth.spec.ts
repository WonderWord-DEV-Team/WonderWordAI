import { test, expect } from "@playwright/test";
import { blockExternalRequests, e2eAuthIds, e2eIds, resetFixtures, signIn } from "./helpers";

test.beforeEach(async ({ page, request }) => {
  await resetFixtures(request);
  await blockExternalRequests(page);
});

test("redirects unauthenticated child-route access", async ({ page }) => {
  await page.goto(`/child/${e2eIds.openSession}/read`);

  await expect(page).toHaveURL(/\/auth\/login$/);
  await expect(page.getByText("Log in to check on your child's progress.")).toBeVisible();
});

test("redirects unauthenticated parent-route access", async ({ page }) => {
  await page.goto("/parent/dashboard");

  await expect(page).toHaveURL(/\/auth\/login$/);
});

test("allows parent dashboard access for a parent", async ({ page, context }) => {
  await signIn(context, e2eAuthIds.parentOne);

  await page.goto("/parent/dashboard");

  await expect(page).toHaveURL(/\/parent\/dashboard$/);
  await expect(page.getByText("parent.one@example.test")).toBeVisible();
  await expect(page.getByText("PARENT", { exact: true })).toBeVisible();
});

test("blocks parent access to child-only mode", async ({ page, context }) => {
  await signIn(context, e2eAuthIds.parentOne);

  await page.goto(`/child/${e2eIds.openSession}/read`);

  await expect(page).toHaveURL(/\/profiles$/);
});

test("blocks child access to parent dashboard", async ({ page, context }) => {
  await signIn(context, e2eAuthIds.childOne);

  await page.goto("/parent/dashboard");

  await expect(page).toHaveURL(/\/child$/);
});

test("blocks child access to parent settings", async ({ page, context }) => {
  await signIn(context, e2eAuthIds.childOne);

  await page.goto("/settings");

  await expect(page).toHaveURL(/\/child$/);
});

test("safely handles missing application profile", async ({ page, context }) => {
  await signIn(context, e2eAuthIds.missingProfile);

  await page.goto("/parent/dashboard");

  await expect(page).toHaveURL(/\/auth\/login\?error=provisioning$/);
  await expect(page.getByText("has not been provisioned with a valid role")).toBeVisible();
});

test("safely handles expired authentication", async ({ page, context }) => {
  await signIn(context, e2eAuthIds.expired);

  await page.goto(`/child/${e2eIds.openSession}/read`);

  await expect(page).toHaveURL(/\/auth\/login$/);
  await expect(page.getByText("Reading Mode")).toHaveCount(0);
});
