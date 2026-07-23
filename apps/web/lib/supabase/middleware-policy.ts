import { getRoleHome, type UserRole } from "../auth/types";

export type MiddlewareAuthState =
  | { status: "unauthenticated" }
  | { status: "invalid-role" }
  | { status: "authenticated"; role: UserRole };

export type MiddlewareDecision =
  | { kind: "next" }
  | { kind: "redirect"; pathname: string; error?: "provisioning" };

export function classifyMiddlewareRequest(
  pathname: string,
  auth: MiddlewareAuthState
): MiddlewareDecision {
  const isProtectedRoute = pathname.startsWith("/parent") || pathname.startsWith("/child");
  const isLoginRoute = pathname === "/auth/login";

  if (auth.status === "unauthenticated") {
    return isProtectedRoute ? { kind: "redirect", pathname: "/auth/login" } : { kind: "next" };
  }

  if (auth.status === "invalid-role") {
    return { kind: "redirect", pathname: "/auth/login", error: "provisioning" };
  }

  if (isLoginRoute) {
    return { kind: "redirect", pathname: getRoleHome(auth.role) };
  }

  if (pathname.startsWith("/parent") && auth.role !== "PARENT") {
    return { kind: "redirect", pathname: getRoleHome(auth.role) };
  }

  if (pathname.startsWith("/child") && auth.role !== "CHILD") {
    return { kind: "redirect", pathname: getRoleHome(auth.role) };
  }

  return { kind: "next" };
}
