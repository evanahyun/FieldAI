/**
 * Canonical public origin for links (no trailing slash).
 * Prefer `NEXT_PUBLIC_APP_URL`, then `NEXT_PUBLIC_SITE_URL` (email / OAuth).
 */
export function getPublicAppOrigin(): string | null {
  const raw = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL)?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}
