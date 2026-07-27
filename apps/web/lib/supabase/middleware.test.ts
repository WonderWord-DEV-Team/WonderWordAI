import assert from "node:assert/strict";
import test from "node:test";

import { parseUserRole } from "../auth/types";
import { copyCookies } from "./middleware-cookies";
import { classifyMiddlewareRequest } from "./middleware-policy";

test("parseUserRole accepts only child and parent roles", () => {
  assert.equal(parseUserRole("CHILD"), "CHILD");
  assert.equal(parseUserRole("parent"), "PARENT");
  assert.equal(parseUserRole("teacher"), null);
  assert.equal(parseUserRole(undefined), null);
});

test("unauthenticated protected requests redirect to login", () => {
  assert.deepEqual(classifyMiddlewareRequest("/parent/dashboard", { status: "unauthenticated" }), {
    kind: "redirect",
    pathname: "/auth/login"
  });
  assert.deepEqual(classifyMiddlewareRequest("/child/demo-session/read", { status: "unauthenticated" }), {
    kind: "redirect",
    pathname: "/auth/login"
  });
});

test("public and API routes remain accessible to unauthenticated requests", () => {
  assert.deepEqual(classifyMiddlewareRequest("/", { status: "unauthenticated" }), { kind: "next" });
  assert.deepEqual(classifyMiddlewareRequest("/auth/login", { status: "unauthenticated" }), {
    kind: "next"
  });
  assert.deepEqual(classifyMiddlewareRequest("/api/sessions", { status: "unauthenticated" }), {
    kind: "next"
  });
});

test("authenticated children and parents are routed by role", () => {
  assert.deepEqual(
    classifyMiddlewareRequest("/child/demo-session/read", { status: "authenticated", role: "CHILD" }),
    { kind: "next" }
  );
  assert.deepEqual(
    classifyMiddlewareRequest("/parent/dashboard", { status: "authenticated", role: "PARENT" }),
    { kind: "next" }
  );
  assert.deepEqual(
    classifyMiddlewareRequest("/parent/dashboard", { status: "authenticated", role: "CHILD" }),
    { kind: "redirect", pathname: "/child/demo-session/read" }
  );
  assert.deepEqual(
    classifyMiddlewareRequest("/child/demo-session/read", { status: "authenticated", role: "PARENT" }),
    { kind: "redirect", pathname: "/parent/dashboard" }
  );
});

test("login route does not redirect unauthenticated users back to itself", () => {
  assert.deepEqual(classifyMiddlewareRequest("/auth/login", { status: "unauthenticated" }), {
    kind: "next"
  });
  assert.deepEqual(
    classifyMiddlewareRequest("/auth/login", { status: "authenticated", role: "PARENT" }),
    { kind: "redirect", pathname: "/parent/dashboard" }
  );
});

test("invalid or missing role metadata fails closed", () => {
  assert.deepEqual(classifyMiddlewareRequest("/parent/dashboard", { status: "invalid-role" }), {
    kind: "redirect",
    pathname: "/auth/login",
    error: "provisioning"
  });
  assert.deepEqual(classifyMiddlewareRequest("/", { status: "invalid-role" }), {
    kind: "redirect",
    pathname: "/auth/login",
    error: "provisioning"
  });
});

test("Supabase response cookies are copied onto redirected responses", () => {
  const copied: Array<{ name: string; value: string }> = [];

  copyCookies(
    {
      cookies: {
        getAll: () => [
          { name: "sb-access-token", value: "new-access" },
          { name: "sb-refresh-token", value: "new-refresh" }
        ]
      }
    },
    {
      cookies: {
        set: (cookie) => copied.push(cookie)
      }
    }
  );

  assert.deepEqual(copied, [
    { name: "sb-access-token", value: "new-access" },
    { name: "sb-refresh-token", value: "new-refresh" }
  ]);
});
