import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseUserRole, getRoleHome } from "@/lib/auth/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (!userError && user) {
        // Fetch the user's role profile to authorize redirection
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("auth_id", user.id)
          .single();

        let role = parseUserRole(profile?.role);

        if (role) {
          // If a custom 'next' page is specified, use it; otherwise redirect to role home
          const targetUrl = next ? `${origin}${next}` : `${origin}${getRoleHome(role)}`;
          return NextResponse.redirect(targetUrl);
        }

        // If we reach here, the user either has no profile row, or their profile row has no valid role.
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
              email: user.email,
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

            const targetUrl = next ? `${origin}${next}` : `${origin}${getRoleHome(newRole)}`;
            return NextResponse.redirect(targetUrl);
          }
        }

        console.error("[Auth Callback] Provisioning failed. Error:", upsertError, "Profile:", newProfile);
        // Fallback if creation fails
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/auth/login?error=provisioning`);
      }
    }
  }

  // Fallback redirect if exchanging code failed or code is missing
  return NextResponse.redirect(`${origin}/auth/login?error=auth-code-error`);
}
