"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/**
 * Supabase email / magic-link redirects often send users to Site URL with ?error=… or #…hash params.
 * This surfaces a human explanation instead of a blank page or browser "connection refused" only.
 */
export function AuthEmailRedirectNotice() {
  const [params, setParams] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const merged: Record<string, string> = {};
    const q = new URLSearchParams(window.location.search);
    q.forEach((v, k) => {
      merged[k] = v;
    });
    const raw = window.location.hash.replace(/^#/, "");
    if (raw) {
      const h = new URLSearchParams(raw);
      h.forEach((v, k) => {
        merged[k] = v;
      });
    }
    if (merged.error || merged.error_code || merged.error_description) {
      setParams(merged);
    }
  }, []);

  const isLocalhost = typeof window !== "undefined" && window.location.hostname === "localhost";

  const body = useMemo(() => {
    if (!params) return null;
    const code = params.error_code ?? "";
    const desc = (params.error_description ?? "").replace(/\+/g, " ");

    if (code === "otp_expired" || /expired|invalid/i.test(desc)) {
      return (
        <>
          <p className="mt-2 text-sm leading-relaxed">
            That confirmation link has <strong>expired</strong> or was already used. Email links are short-lived for
            security.
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-amber-950/90">
            <li>
              Go back to <Link className="font-semibold underline" href="/signup">Sign up</Link> and create the
              account again (use the same email if you like — Supabase may say the user exists; then use{" "}
              <Link className="font-semibold underline" href="/login">Log in</Link> and request a new confirmation from
              the Supabase dashboard if needed).
            </li>
            <li>
              Or in Supabase → <strong>Authentication → Users</strong>, find your user and use the resend / confirm
              options there.
            </li>
          </ul>
        </>
      );
    }

    if (params.error === "access_denied") {
      return (
        <p className="mt-2 text-sm leading-relaxed">
          Sign-in was cancelled or denied ({desc || "no details"}). Try signing up or logging in again from FieldAI.
        </p>
      );
    }

    return desc ? <p className="mt-2 text-sm">{desc}</p> : null;
  }, [params]);

  if (!params) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-4 text-amber-950">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold">Email confirmation / auth redirect</p>
        {body}
        {isLocalhost ? (
          <p className="mt-3 text-sm leading-relaxed border-t border-amber-200/80 pt-3">
            You were sent to <strong>localhost</strong>. That only works if <code className="rounded bg-amber-100/80 px-1">npm run dev</code> is
            running on this machine. If you meant to use the <strong>hosted app on Vercel</strong>, open Supabase →{" "}
            <strong>Authentication → URL configuration</strong> and set <strong>Site URL</strong> (and{" "}
            <strong>Redirect URLs</strong>) to your Vercel URL (for example{" "}
            <code className="rounded bg-amber-100/80 px-1">https://your-app.vercel.app</code>
            ), then request a <strong>new</strong> confirmation email.
          </p>
        ) : null}
        <p className="mt-3 text-xs text-amber-900/80">
          After fixing Supabase URLs, clear the address bar query string or click{" "}
          <Link href="/" className="font-semibold underline">
            Home
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
