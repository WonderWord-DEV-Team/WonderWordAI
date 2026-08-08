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
  const isParentProtectedRoute = pathname.startsWith("/parent") || pathname === "/settings";
  const isChildProtectedRoute = pathname.startsWith("/child");
  const isProtectedRoute = isParentProtectedRoute || isChildProtectedRoute;
  const isLoginRoute = pathname === "/auth/login";

  if (auth.status === "unauthenticated") {
    return isProtectedRoute ? { kind: "redirect", pathname: "/auth/login" } : { kind: "next" };
  }

  if (auth.status === "invalid-role") {
    if (isLoginRoute) {
      return { kind: "next" };
    }

    return { kind: "redirect", pathname: "/auth/login", error: "provisioning" };
  }

  if (isLoginRoute) {
    return { kind: "redirect", pathname: getRoleHome(auth.role) };
  }

  if (isParentProtectedRoute && auth.role !== "PARENT") {
    return { kind: "redirect", pathname: getRoleHome(auth.role) };
  }

  if (isChildProtectedRoute && auth.role !== "CHILD") {
    return { kind: "redirect", pathname: getRoleHome(auth.role) };
  }

  return { kind: "next" };
}
