import { test, expect } from "@playwright/test";
import {
  blockExternalRequests,
  e2eAuthIds,
  e2eWorksheetText,
  resetFixtures,
  signIn,
  syntheticWorksheetFile
} from "./helpers";

test.beforeEach(async ({ page, request }) => {
  await resetFixtures(request);
  await blockExternalRequests(page);
});

test("renders deterministic OCR text", async ({ page, context }) => {
  await signIn(context, e2eAuthIds.childOne);
  await page.goto("/child");

  await page.locator("#worksheet-image").setInputFiles(syntheticWorksheetFile());
  await page.getByRole("button", { name: "Scan worksheet" }).click();

  await expect(page).toHaveURL(/\/child\/50000000-0000-4000-8000-000000000001\/read$/);
  await expect(page.getByText(e2eWorksheetText)).toBeVisible();
});

test("handles refresh without retaining raw image", async ({ page, context }) => {
  await signIn(context, e2eAuthIds.childOne);
  await page.goto("/child");

  await page.locator("#worksheet-image").setInputFiles(syntheticWorksheetFile());
  await page.getByRole("button", { name: "Scan worksheet" }).click();
  await expect(page.getByText(e2eWorksheetText)).toBeVisible();

  await page.reload();

  await expect(page.getByText(e2eWorksheetText)).toHaveCount(0);
  await expect(page.getByText("Worksheet text is no longer available")).toBeVisible();

  const storage = await page.evaluate(() => ({ ...localStorage }));
  expect(JSON.stringify(storage)).not.toContain("data:image");
});

test("rejects stale worksheet state from a different session", async ({ page, context }) => {
  await signIn(context, e2eAuthIds.childOne);
  await page.addInitScript(() => {
    localStorage.setItem("worksheetText", "Stale text from another session");
    localStorage.setItem("worksheetImage", "data:image/png;base64,stale");
  });

  await page.goto("/child/40000000-0000-4000-8000-000000000001/read");

  await expect(page.getByText("Stale text from another session")).toHaveCount(0);
  await expect(page.getByText("Worksheet text is no longer available")).toBeVisible();
});
