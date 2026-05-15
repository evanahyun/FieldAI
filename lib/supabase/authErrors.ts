/**
 * Supabase Auth uses `fetch()` in the browser. "Failed to fetch" means no HTTP response
 * was received (DNS, TLS, network block, wrong host, or browser extension).
 */
export function describeSupabaseAuthNetworkError(message: string, isPreviewHost: boolean): string {
  const m = message.toLowerCase();
  if (!m.includes("fetch") && !m.includes("network")) {
    return message;
  }

  const lines = [
    message,
    "",
    "This usually means your browser never reached Supabase (not a wrong password). Common fixes:",
    "• Open DevTools → Network, try again, and click the red/failed request to `…supabase.co` — note the status (blocked, CORS, ERR_NAME_NOT_RESOLVED, etc.).",
    "• Disable ad blockers / privacy extensions for this site (they often block `*.supabase.co`). Try a private window with extensions off.",
    "• In Vercel → Settings → Environment Variables: confirm `NEXT_PUBLIC_SUPABASE_URL` is exactly `https://<project-ref>.supabase.co` (no quotes, no spaces). Redeploy after changes.",
  ];

  if (isPreviewHost) {
    lines.push(
      "• Preview URLs (…vercel.app): ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set for the Preview environment, not only Production.",
    );
  }

  lines.push(
    "• In Supabase → Authentication → URL configuration: add your Vercel URL to Redirect URLs if you use magic links; Site URL should match your main app URL.",
  );

  return lines.join("\n");
}

export function isLikelyVercelPreviewHost(hostname: string): boolean {
  return hostname.endsWith(".vercel.app") && hostname.includes("-");
}
