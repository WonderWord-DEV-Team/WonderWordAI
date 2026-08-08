import { test, expect } from "@playwright/test";
import { authHeaders, e2eAuthIds, e2eIds, resetFixtures } from "./helpers";

test.beforeEach(async ({ request }) => {
  await resetFixtures(request);
});

test("unauthorized session API request is rejected", async ({ request }) => {
  const response = await request.get(`/api/sessions/${e2eIds.openSession}`);

  expect(response.status()).toBe(401);
});

test("cross-family session API request is rejected", async ({ request }) => {
  const response = await request.get(`/api/sessions/${e2eIds.otherChildSession}`, {
    headers: authHeaders(e2eAuthIds.childOne)
  });
  const body = await response.text();

  expect(response.status()).toBe(404);
  expect(body).not.toContain("E2E Child Two");
});

test("parent direct session API request for another family is rejected", async ({ request }) => {
  const response = await request.get(`/api/sessions/${e2eIds.otherChildSession}`, {
    headers: authHeaders(e2eAuthIds.parentOne)
  });
  const body = await response.text();

  expect(response.status()).toBe(404);
  expect(body).not.toContain("E2E Child Two");
});

test("closed-session write is rejected", async ({ request }) => {
  const response = await request.post("/api/upload", {
    headers: authHeaders(e2eAuthIds.childOne),
    multipart: {
      sessionId: e2eIds.closedSession,
      file: {
        name: "synthetic-worksheet.png",
        mimeType: "image/png",
        buffer: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
          "base64"
        )
      }
    }
  });

  expect(response.status()).toBe(409);
});

test("malformed session input does not produce a server crash", async ({ request }) => {
  const response = await request.get("/api/sessions/not-a-uuid", {
    headers: authHeaders(e2eAuthIds.childOne)
  });

  expect(response.status()).toBe(400);
});

test("missing session input is rejected", async ({ request }) => {
  const response = await request.post("/api/upload", {
    headers: authHeaders(e2eAuthIds.childOne),
    multipart: {
      file: {
        name: "synthetic-worksheet.png",
        mimeType: "image/png",
        buffer: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
          "base64"
        )
      }
    }
  });

  expect(response.status()).toBe(400);
});

test("repeated session-close request is safe", async ({ request }) => {
  const first = await request.patch(`/api/sessions/${e2eIds.openSession}`, {
    headers: authHeaders(e2eAuthIds.childOne),
    data: { action: "close" }
  });
  const second = await request.patch(`/api/sessions/${e2eIds.openSession}`, {
    headers: authHeaders(e2eAuthIds.childOne),
    data: { action: "close" }
  });

  expect(first.ok()).toBeTruthy();
  expect(second.ok()).toBeTruthy();
  expect((await second.json()).session.status).toBe("closed");
});
