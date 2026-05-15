import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          /* Server Component cannot set cookies; middleware refreshes session */
        }
      },
    },
  }) as unknown as SupabaseClient<Database>;
}

/** Use in route handlers / pages when you want a friendly UI instead of throwing. */
export async function tryCreateClient(): Promise<
  { ok: true; supabase: SupabaseClient<Database> } | { ok: false; error: string }
> {
  try {
    const supabase = await createClient();
    return { ok: true, supabase };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Supabase is not configured.";
    return { ok: false, error: message };
  }
}
