import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getE2eAuthState, isE2eMode } from "@/lib/e2e/fixtures";
import { parseUserRole } from "@/lib/auth/types";
import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase/env";
import { copyCookies } from "@/lib/supabase/middleware-cookies";
import { classifyMiddlewareRequest } from "@/lib/supabase/middleware-policy";

function redirectWithCookies(
  request: NextRequest,
  supabaseResponse: NextResponse,
  pathname: string
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";

  const response = NextResponse.redirect(url);
  copyCookies(supabaseResponse, response);
  return response;
}

function redirectToLogin(
  request: NextRequest,
  supabaseResponse: NextResponse,
  error?: "provisioning"
) {
  const url = request.nextUrl.clone();
  url.pathname = "/auth/login";
  url.search = error ? `?error=${error}` : "";

  const response = NextResponse.redirect(url);
  copyCookies(supabaseResponse, response);
  return response;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request
  });

  const pathname = request.nextUrl.pathname;

  if (isE2eMode()) {
    const auth = getE2eAuthState(request.cookies);
    const decision =
      auth.status === "authenticated"
        ? classifyMiddlewareRequest(pathname, { status: "authenticated", role: auth.appUser.role })
        : classifyMiddlewareRequest(pathname, { status: auth.status });

    if (decision.kind !== "redirect") {
      return supabaseResponse;
    }

    return decision.pathname === "/auth/login"
      ? redirectToLogin(request, supabaseResponse, decision.error)
      : redirectWithCookies(request, supabaseResponse, decision.pathname);
  }

  if (!hasSupabaseEnv()) {
    const decision = classifyMiddlewareRequest(pathname, { status: "unauthenticated" });
    return decision.kind === "redirect"
      ? redirectToLogin(request, supabaseResponse, decision.error)
      : supabaseResponse;
  }

  const { url, publishableKey } = getSupabaseEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      }
    }
  });

  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    const decision = classifyMiddlewareRequest(pathname, { status: "unauthenticated" });
    return decision.kind === "redirect"
      ? redirectToLogin(request, supabaseResponse, decision.error)
      : supabaseResponse;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("auth_id", data.user.id)
    .single();

  const role = parseUserRole(profile?.role);

  if (!role) {
    await supabase.auth.signOut();
    const decision = classifyMiddlewareRequest(pathname, { status: "invalid-role" });
    return decision.kind === "redirect"
      ? redirectToLogin(request, supabaseResponse, decision.error)
      : supabaseResponse;
  }

  const decision = classifyMiddlewareRequest(pathname, { status: "authenticated", role });

  return decision.kind === "redirect"
    ? redirectWithCookies(request, supabaseResponse, decision.pathname)
    : supabaseResponse;
}
