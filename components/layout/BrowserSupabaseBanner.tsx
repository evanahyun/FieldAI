"use client";

import { useEffect, useState } from "react";
import { isBrowserSupabaseConfigured, BROWSER_SUPABASE_MISSING_MESSAGE } from "@/lib/supabase/client";

/**
 * Client-side check: NEXT_PUBLIC_* vars are inlined at build time.
 * If Vercel was deployed without them, the server banner may be absent while the app is still broken in the browser.
 */
export function BrowserSupabaseBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(!isBrowserSupabaseConfigured());
  }, []);

  if (!show) {
    return null;
  }

  return (
    <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-950">
      <strong>Client configuration error.</strong> {BROWSER_SUPABASE_MISSING_MESSAGE}
    </div>
  );
}
