import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getRoleHome, parseUserRole } from "@/lib/auth/types";
import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase/env";

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}

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
  const isProtectedRoute = pathname.startsWith("/parent") || pathname.startsWith("/child");
  const isLoginRoute = pathname === "/auth/login";

  if (!hasSupabaseEnv()) {
    return isProtectedRoute ? redirectToLogin(request, supabaseResponse) : supabaseResponse;
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
    return isProtectedRoute ? redirectToLogin(request, supabaseResponse) : supabaseResponse;
  }

  const role = parseUserRole(data.user.app_metadata?.user_role);

  if (!role) {
    await supabase.auth.signOut();
    return redirectToLogin(request, supabaseResponse, "provisioning");
  }

  if (isLoginRoute) {
    return redirectWithCookies(request, supabaseResponse, getRoleHome(role));
  }

  if (pathname.startsWith("/parent") && role !== "PARENT") {
    return redirectWithCookies(request, supabaseResponse, getRoleHome(role));
  }

  if (pathname.startsWith("/child") && role !== "CHILD") {
    return redirectWithCookies(request, supabaseResponse, getRoleHome(role));
  }

  return supabaseResponse;
}
