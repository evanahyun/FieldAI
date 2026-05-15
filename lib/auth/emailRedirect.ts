/** Where Supabase should send users after they click “confirm email” (must be listed in Supabase Redirect URLs). */
export function getEmailConfirmationRedirectUrl(): string {
  if (typeof window === "undefined") {
    return "";
  }
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv && /^https?:\/\//i.test(fromEnv)) {
    return `${fromEnv.replace(/\/$/, "")}/auth/callback`;
  }
  return `${window.location.origin}/auth/callback`;
}
