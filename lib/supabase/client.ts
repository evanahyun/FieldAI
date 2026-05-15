import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export const BROWSER_SUPABASE_MISSING_MESSAGE =
  "Supabase is not configured in this deployment. In Vercel → Settings → Environment Variables, set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for Production (and Preview if you use it), then trigger a new deployment so the values are baked into the JavaScript bundle.";

/** True when the browser bundle has usable public Supabase env (set at build time on Vercel). */
export function isBrowserSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return false;
  return /^https?:\/\//i.test(url);
}

export type BrowserSupabaseResult =
  | { ok: true; client: SupabaseClient<Database> }
  | { ok: false; error: string };

let cached: SupabaseClient<Database> | null = null;

/** Prefer this in Client Components so you can show `error` instead of crashing. */
export function tryCreateBrowserClient(): BrowserSupabaseResult {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    return { ok: false, error: BROWSER_SUPABASE_MISSING_MESSAGE };
  }
  if (!/^https?:\/\//i.test(url)) {
    return {
      ok: false,
      error:
        "NEXT_PUBLIC_SUPABASE_URL must start with https:// (check for typos or missing scheme in Vercel env).",
    };
  }
  if (!cached) {
    cached = createBrowserClient<Database>(url, key) as unknown as SupabaseClient<Database>;
  }
  return { ok: true, client: cached };
}

/**
 * Browser Supabase client. Throws if env is missing — avoid in event handlers without try/catch;
 * use `tryCreateBrowserClient()` instead for user-visible errors.
 */
export function createClient(): SupabaseClient<Database> {
  const r = tryCreateBrowserClient();
  if (!r.ok) {
    throw new Error(r.error);
  }
  return r.client;
}
