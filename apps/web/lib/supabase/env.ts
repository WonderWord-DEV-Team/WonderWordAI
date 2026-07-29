const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function isValidHttpUrl(value: string | undefined): value is string {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function hasSupabaseEnv() {
  return isValidHttpUrl(SUPABASE_URL) && Boolean(SUPABASE_PUBLISHABLE_KEY?.trim());
}

export function getSupabaseEnv() {
  if (!isValidHttpUrl(SUPABASE_URL) || !SUPABASE_PUBLISHABLE_KEY?.trim()) {
    throw new Error(
      "Missing or invalid NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  return {
    url: SUPABASE_URL.trim(),
    publishableKey: SUPABASE_PUBLISHABLE_KEY.trim()
  };
}