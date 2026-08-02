import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase/env";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";
import { parseUserRole, getRoleHome } from "@/lib/auth/types";

export const dynamic = "force-dynamic";

function redirectWithCookies(
  url: string,
  cookiesToSet: Array<{ name: string; value: string; options: any }>
) {
  const response = NextResponse.redirect(url);
  
  // De-duplicate cookies keeping the last one set to avoid sending duplicate Set-Cookie headers
  const uniqueCookies = new Map<string, { value: string; options: any }>();
  cookiesToSet.forEach(({ name, value, options }) => {
    uniqueCookies.set(name, { value, options });
  });

  uniqueCookies.forEach(({ value, options }, name) => {
    response.cookies.set(name, value, options);
  });
  
  return response;
}

function getSafeRedirectUrl(next: string | null, origin: string, defaultPath: string): string {
  if (!next) {
    return `${origin}${defaultPath}`;
  }

  // To prevent open redirect vulnerabilities, ensure the 'next' parameter is a relative path.
  // A safe relative path must start with '/' and must not start with '//' or '/\'
  if (next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")) {
    try {
      const parsed = new URL(next, origin);
      if (parsed.origin === origin) {
        return parsed.toString();
      }
    } catch {
      // Ignore URL parsing errors and fall back
    }
  }

  return `${origin}${defaultPath}`;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const oauthError = searchParams.get("error");
  const oauthErrorDescription = searchParams.get("error_description");

  const cookiesToSetOnResponse: Array<{ name: string; value: string; options: any }> = [];

  if (oauthError) {
    console.error("[Auth Callback] OAuth provider error:", oauthError, oauthErrorDescription);
    return NextResponse.redirect(`${origin}/auth/login?error=auth-code-error`);
  }

  if (!hasSupabaseEnv()) {
    console.error("[Auth Callback] Supabase environment variables are not configured.");
    return NextResponse.redirect(`${origin}/auth/login?error=auth-code-error`);
  }

  if (code) {
    const { url: supabaseUrl, publishableKey } = getSupabaseEnv();
    const cookieStore = cookies();

    // Create the supabase server client inline to capture cookie modifications
    const supabase = createServerClient(supabaseUrl, publishableKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options);
            } catch {
              // Server Components cannot set cookies.
            }
            cookiesToSetOnResponse.push({ name, value, options });
          });
        }
      }
    });

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("[Auth Callback] Code exchange failed:", exchangeError);
      return redirectWithCookies(
        `${origin}/auth/login?error=auth-code-error`,
        cookiesToSetOnResponse
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("[Auth Callback] Fetching user failed after session exchange:", userError);
      return redirectWithCookies(
        `${origin}/auth/login?error=auth-code-error`,
        cookiesToSetOnResponse
      );
    }

    if (!user.email) {
      console.error("[Auth Callback] User email is missing from auth response.");
      await supabase.auth.signOut();
      return redirectWithCookies(
        `${origin}/auth/login?error=auth-code-error`,
        cookiesToSetOnResponse
      );
    }

    // Fetch the user's role profile to authorize redirection
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("auth_id", user.id)
      .single();

    let role = parseUserRole(profile?.role);

    if (role) {
      const targetUrl = getSafeRedirectUrl(next, origin, getRoleHome(role));
      return redirectWithCookies(targetUrl, cookiesToSetOnResponse);
    }

    // If we reach here, the user either has no profile row, or their profile row has no valid role.
    if (!hasSupabaseAdminEnv()) {
      console.error("[Auth Callback] Admin client cannot be initialized: SUPABASE_SERVICE_ROLE_KEY is missing.");
      await supabase.auth.signOut();
      return redirectWithCookies(
        `${origin}/auth/login?error=provisioning`,
        cookiesToSetOnResponse
      );
    }

    const adminSupabase = createAdminClient();
    let newProfile = null;
    let upsertError = null;

    if (profile) {
      // Profile exists but has no valid role. Update it to PARENT.
      console.log("[Auth Callback] Profile exists but has no valid role. Updating role to PARENT...");
      const { data, error } = await adminSupabase
        .from("users")
        .update({ role: "PARENT" })
        .eq("auth_id", user.id)
        .select("role")
        .single();
      
      newProfile = data;
      upsertError = error;
    } else {
      // Profile does not exist at all. Try to insert it.
      console.log("[Auth Callback] Profile does not exist. Inserting new profile with role PARENT...");
      const { data, error } = await adminSupabase
        .from("users")
        .insert({
          auth_id: user.id,
          email: user.email ?? "",
          role: "PARENT"
        })
        .select("role")
        .single();
      
      newProfile = data;
      upsertError = error;

      // Race condition fallback: If insert fails because a trigger concurrently inserted the row,
      // recover by updating the role to PARENT.
      if (error) {
        console.log("[Auth Callback] Insert failed. Retrying with update/select due to trigger race...");
        const { data: retryProfile, error: retryError } = await adminSupabase
          .from("users")
          .update({ role: "PARENT" })
          .eq("auth_id", user.id)
          .select("role")
          .single();
        
        if (!retryError && retryProfile) {
          newProfile = retryProfile;
          upsertError = null;
        }
      }
    }

    if (!upsertError && newProfile) {
      const newRole = parseUserRole(newProfile.role);
      if (newRole) {
        // Refresh the session so that the custom access token claims (user_role)
        // are updated in the JWT before redirecting the user.
        console.log("[Auth Callback] Refreshing session to populate custom claims...");
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.error("[Auth Callback] Session refresh failed:", refreshError);
        }

        const targetUrl = getSafeRedirectUrl(next, origin, getRoleHome(newRole));
        return redirectWithCookies(targetUrl, cookiesToSetOnResponse);
      }
    }

    console.error("[Auth Callback] Provisioning failed. Error:", upsertError, "Profile:", newProfile);
    // Fallback if creation fails
    await supabase.auth.signOut();
    return redirectWithCookies(
      `${origin}/auth/login?error=provisioning`,
      cookiesToSetOnResponse
    );
  }

  // Fallback redirect if exchanging code failed or code is missing
  return redirectWithCookies(
    `${origin}/auth/login?error=auth-code-error`,
    cookiesToSetOnResponse
  );
}

