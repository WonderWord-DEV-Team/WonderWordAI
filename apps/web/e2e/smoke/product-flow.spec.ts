import { test, expect } from "@playwright/test";
import {
  blockExternalRequests,
  e2eAuthIds,
  e2eIds,
  e2eWorksheetText,
  resetFixtures,
  signIn,
  syntheticWorksheetFile
} from "../helpers";
import {
  assertNoDocumentHorizontalOverflow,
  assertTouchTarget,
  installRuntimeErrorMonitor
} from "../responsive/assertions";
import { installGrantedMediaMocks } from "./media-mocks";

test.beforeEach(async ({ page, request }) => {
  await resetFixtures(request);
  await blockExternalRequests(page);
});

test("parent smoke: login entry, dashboard, child report cards, navigation, logout", async ({
  page,
  context
}) => {
  const runtime = installRuntimeErrorMonitor(page);

  await page.goto("/auth/login");
  await expect(page.getByRole("heading", { name: "Welcome Back!" })).toBeVisible();

  await signIn(context, e2eAuthIds.parentOne);
  await page.goto("/parent/dashboard");

  await expect(page).toHaveURL(/\/parent\/dashboard$/);
  await expect(page.getByRole("button", { name: "E2E Child One" })).toBeVisible();
  await expect(page.getByRole("button", { name: "E2E Child With A Wonderfully Long Practice Name" })).toBeVisible();
  await expect(page.getByText("E2E Child One's Reading Journey")).toBeVisible();
  await expect(page.getByText("Reading Speed", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Recommended Next Steps:")).toBeVisible();

  await assertNoDocumentHorizontalOverflow(page);
  await assertTouchTarget(page.getByRole("link", { name: "Switch to Child" }));

  await page.getByRole("button", { name: "E2E Child With A Wonderfully Long Practice Name" }).click();
  await expect(page.getByText("No sessions in the selected period")).toBeVisible();
  await assertNoDocumentHorizontalOverflow(page);

  await page.getByRole("link", { name: "Switch to Child" }).click();
  await expect(page).toHaveURL(/\/profiles$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/parent\/dashboard$/);

  await page.getByRole("button", { name: "Log Out" }).click();
  await expect(page).toHaveURL(/\/auth\/login$/);

  runtime.assertClean();
});

test("child smoke: worksheet upload, OCR, recording stop, close session", async ({
  page,
  context
}) => {
  const runtime = installRuntimeErrorMonitor(page);
  await installGrantedMediaMocks(page);
  let audioUploadCount = 0;
  await page.route("**/api/sessions/*/audio", async (route) => {
    audioUploadCount += 1;
    const words = e2eWorksheetText.split(/\s+/);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          sessionId: "50000000-0000-4000-8000-000000000001",
          transcript: e2eWorksheetText,
          words: words.map((word, index) => ({
            word,
            start: index * 0.45,
            end: (index + 1) * 0.45
          })),
          miscues: [
            {
              word: "glows",
              expectedPhonemes: "g l ow z",
              actualPhonemes: "g l aw z",
              phonicsCategory: "long_vowels",
              similarityScore: 0.74,
              confidence: 0.86,
              isCorrect: false
            }
          ]
        }
      })
    });
  });

  await page.goto("/auth/login");
  await expect(page.getByRole("heading", { name: "Welcome Back!" })).toBeVisible();

  await signIn(context, e2eAuthIds.childOne);
  await page.goto("/child");

  await expect(page.getByRole("heading", { name: "Snap homework" })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.MediaRecorder?.toString().includes("FakeMediaRecorder")))
    .toBe(true);
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("__wonderwordE2eMedia"))).toBe("1");
  await assertNoDocumentHorizontalOverflow(page);
  await assertTouchTarget(page.getByRole("button", { name: "Open camera" }));

  await page.locator("#worksheet-image").setInputFiles(syntheticWorksheetFile());
  await expect(page.getByRole("button", { name: "Scan worksheet" })).toBeEnabled();
  await page.getByRole("button", { name: "Scan worksheet" }).click();

  await expect(page).toHaveURL(/\/child\/50000000-0000-4000-8000-000000000001\/read$/);
  await expect(page.getByText(e2eWorksheetText)).toBeVisible();
  await assertNoDocumentHorizontalOverflow(page);

  await page.getByRole("button", { name: "Rescan worksheet" }).click();
  await expect(page.getByRole("heading", { name: "Rescan worksheet" })).toBeVisible();
  await assertNoDocumentHorizontalOverflow(page);
  await page.getByRole("button", { name: "Close" }).click();

  await page.evaluate(() => {
    window.__wonderwordE2eMedia = true;
    window.localStorage.setItem("__wonderwordE2eMedia", "1");
  });
  await page.getByRole("button", { name: "Start reading" }).click();
  await expect(page.getByText("Recording now")).toBeVisible();
  await page.waitForTimeout(100);
  await page.getByRole("button", { name: "Stop recording" }).click();

  expect(audioUploadCount).toBe(0);
  await expect(page.getByText("Listening back to your reading...").first()).toBeVisible();
  await assertNoDocumentHorizontalOverflow(page);

  await page.getByRole("button", { name: "End Session" }).click();
  await expect(page).toHaveURL(/\/child$/);

  await page.goto(`/child/${e2eIds.openSession}/read`);
  await expect(page.getByText("Worksheet text is no longer available")).toBeVisible();

  await page.goto("/child/50000000-0000-4000-8000-000000000001/read");
  await expect(page.getByText("This reading session is already closed.")).toBeVisible();

  runtime.assertClean();
});
