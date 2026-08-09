import { test } from "@playwright/test";
import { blockExternalRequests, e2eAuthIds, resetFixtures, signIn } from "./helpers";

test.beforeEach(async ({ request }) => {
  await resetFixtures(request);
});

test("public pages logged out", async ({ page }) => {
  await blockExternalRequests(page);

  await page.goto("/terms");
  await page.waitForTimeout(300);
  await page.screenshot({ path: "test-results/tmp-terms-loggedout.png", fullPage: false });

  await page.goto("/help");
  await page.waitForTimeout(300);
  await page.screenshot({ path: "test-results/tmp-help-loggedout.png", fullPage: false });
});

test("public pages logged in as child", async ({ page, context }) => {
  await blockExternalRequests(page);
  await signIn(context, e2eAuthIds.childOne);

  await page.goto("/privacy");
  await page.waitForTimeout(300);
  await page.screenshot({ path: "test-results/tmp-privacy-loggedin-child.png", fullPage: false });

  await page.goto("/explorer");
  await page.waitForTimeout(300);
  await page.screenshot({ path: "test-results/tmp-explorer.png", fullPage: false });
});

test("public pages logged in as parent", async ({ page, context }) => {
  await blockExternalRequests(page);
  await signIn(context, e2eAuthIds.parentOne);

  await page.goto("/help");
  await page.waitForTimeout(300);
  await page.screenshot({ path: "test-results/tmp-help-loggedin-parent.png", fullPage: false });
});
