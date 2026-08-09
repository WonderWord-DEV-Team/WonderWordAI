import { expect, type Locator, type Page } from "@playwright/test";

type RuntimeIssue = {
  type: "pageerror" | "console" | "api";
  message: string;
};

const benignConsolePatterns = [
  /Download the React DevTools/i,
  /Fast Refresh/i
];

export function installRuntimeErrorMonitor(page: Page) {
  const issues: RuntimeIssue[] = [];

  page.on("pageerror", (error) => {
    issues.push({ type: "pageerror", message: error.message });
  });

  page.on("console", (message) => {
    if (message.type() !== "error") {
      return;
    }

    const text = message.text();
    if (benignConsolePatterns.some((pattern) => pattern.test(text))) {
      return;
    }

    issues.push({ type: "console", message: text });
  });

  page.on("response", (response) => {
    const url = new URL(response.url());
    const isLocalApi =
      (url.hostname === "127.0.0.1" || url.hostname === "localhost") &&
      url.pathname.startsWith("/api/");

    if (isLocalApi && response.status() >= 500) {
      issues.push({
        type: "api",
        message: `${response.status()} ${url.pathname}`
      });
    }
  });

  return {
    assertClean() {
      expect(issues).toEqual([]);
    }
  };
}

export async function assertNoDocumentHorizontalOverflow(page: Page, tolerance = 2) {
  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body?.scrollWidth ?? 0
  }));

  expect(Math.max(dimensions.scrollWidth, dimensions.bodyScrollWidth)).toBeLessThanOrEqual(
    dimensions.innerWidth + tolerance
  );
}

export async function assertLocatorWithinViewport(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();

  const viewport = locator.page().viewportSize();
  expect(viewport).not.toBeNull();

  if (!box || !viewport) {
    return;
  }

  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
}

export async function assertTouchTarget(locator: Locator, minimum = 40) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();

  if (!box) {
    return;
  }

  expect(box.width).toBeGreaterThanOrEqual(minimum);
  expect(box.height).toBeGreaterThanOrEqual(minimum);
}
