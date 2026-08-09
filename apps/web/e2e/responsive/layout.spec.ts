import { test, expect } from "@playwright/test";
import {
  blockExternalRequests,
  e2eAuthIds,
  e2eIds,
  resetFixtures,
  signIn
} from "../helpers";
import {
  assertLocatorWithinViewport,
  assertNoDocumentHorizontalOverflow,
  assertTouchTarget,
  installRuntimeErrorMonitor
} from "./assertions";

test.beforeEach(async ({ page, request }) => {
  await resetFixtures(request);
  await blockExternalRequests(page);
});

test("public routes do not horizontally overflow", async ({ page }) => {
  const runtime = installRuntimeErrorMonitor(page);

  for (const route of ["/", "/auth/login", "/auth/forgot-password", "/privacy", "/terms"]) {
    await page.goto(route);
    await expect(page.locator("body")).toBeVisible();
    await assertNoDocumentHorizontalOverflow(page);
  }

  runtime.assertClean();
});

test("parent dashboard remains usable at responsive viewport", async ({ page, context }) => {
  const runtime = installRuntimeErrorMonitor(page);
  await signIn(context, e2eAuthIds.parentOne);

  await page.goto("/parent/dashboard");
  await expect(page.getByText("E2E Child One's Reading Journey")).toBeVisible();
  await assertNoDocumentHorizontalOverflow(page);
  await assertTouchTarget(page.getByRole("link", { name: "Switch to Child" }));
  await assertLocatorWithinViewport(page.getByRole("button", { name: "Log Out" }));

  await page.getByRole("button", { name: "E2E Child With A Wonderfully Long Practice Name" }).click();
  await expect(page.getByText("E2E Child With A Wonderfully Long Practice Name's Reading Journey")).toBeVisible();
  await assertNoDocumentHorizontalOverflow(page);

  runtime.assertClean();
});

test("child home and reading recovery remain usable at responsive viewport", async ({
  page,
  context
}) => {
  const runtime = installRuntimeErrorMonitor(page);
  await signIn(context, e2eAuthIds.childOne);

  await page.goto("/child");
  await expect(page.getByRole("heading", { name: "Snap homework" })).toBeVisible();
  await assertNoDocumentHorizontalOverflow(page);
  await assertTouchTarget(page.getByRole("button", { name: "Open camera" }));
  await assertTouchTarget(page.getByRole("button", { name: "Choose photo" }));

  await page.goto(`/child/${e2eIds.openSession}/read`);
  await expect(page.getByText("Worksheet text is no longer available")).toBeVisible();
  await assertNoDocumentHorizontalOverflow(page);
  await assertTouchTarget(page.getByRole("button", { name: "End Session" }));

  runtime.assertClean();
});
