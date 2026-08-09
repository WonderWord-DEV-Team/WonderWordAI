import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import {
  blockExternalRequests,
  e2eAuthIds,
  e2eWorksheetText,
  resetFixtures,
  signIn,
  syntheticWorksheetFile
} from "../helpers";
import { assertNoDocumentHorizontalOverflow, installRuntimeErrorMonitor } from "../responsive/assertions";
import {
  installDeniedMicrophoneMock,
  installNoCameraMock,
  installNoMediaRecorderMock
} from "./media-mocks";

test.beforeEach(async ({ page, request }) => {
  await resetFixtures(request);
  await blockExternalRequests(page);
});

test("worksheet capture handles camera unavailable and invalid files", async ({ page, context }) => {
  const runtime = installRuntimeErrorMonitor(page);
  await installNoCameraMock(page);
  await signIn(context, e2eAuthIds.childOne);

  await page.goto("/child");
  await page.getByRole("button", { name: "Open camera" }).click();
  await expect(page.getByText("Camera preview is not available here")).toBeVisible();

  await page.locator("#worksheet-image").setInputFiles({
    name: "worksheet.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not an image")
  });
  await expect(page.getByText("Please upload a JPEG, PNG, or WebP image.")).toBeVisible();

  await page.locator("#worksheet-image").setInputFiles({
    name: "too-large.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(11 * 1024 * 1024)
  });
  await expect(page.getByText("Please upload an image smaller than 10 MB.")).toBeVisible();
  await assertNoDocumentHorizontalOverflow(page);

  runtime.assertClean();
});

test("worksheet capture reports OCR failure and allows retry", async ({ page, context }) => {
  await signIn(context, e2eAuthIds.childOne);
  await page.route("**/api/upload", async (route) => {
    await route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "ocr_upstream_error", message: "OCR retry test." } })
    });
  });

  await page.goto("/child");
  await page.locator("#worksheet-image").setInputFiles(syntheticWorksheetFile());
  await page.getByRole("button", { name: "Scan worksheet" }).click();

  await expect(page.getByText("OCR retry test.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Scan worksheet" })).toBeEnabled();
  await assertNoDocumentHorizontalOverflow(page);
});

test("reading controls recover when microphone permission is denied", async ({ page, context }) => {
  const runtime = installRuntimeErrorMonitor(page);
  await installDeniedMicrophoneMock(page);
  await reachReadingMode(page, context);

  await page.getByRole("button", { name: "Start reading" }).click();
  await expect(page.getByText("Microphone permission was blocked. Allow microphone access, then try again.").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry recording" })).toBeEnabled();
  await assertNoDocumentHorizontalOverflow(page);

  runtime.assertClean();
});

test("reading controls explain unsupported MediaRecorder", async ({ page, context }) => {
  const runtime = installRuntimeErrorMonitor(page);
  await installNoMediaRecorderMock(page);
  await reachReadingMode(page, context);

  await page.getByRole("button", { name: "Start reading" }).click();
  await expect(page.getByText("This browser cannot record reading audio.").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry recording" })).toBeEnabled();
  await assertNoDocumentHorizontalOverflow(page);

  runtime.assertClean();
});

async function reachReadingMode(page: Page, context: BrowserContext) {
  await signIn(context, e2eAuthIds.childOne);
  await page.goto("/child");
  await page.locator("#worksheet-image").setInputFiles(syntheticWorksheetFile());
  await page.getByRole("button", { name: "Scan worksheet" }).click();
  await expect(page.getByText(e2eWorksheetText)).toBeVisible();
}
