"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { describeSupabaseAuthNetworkError, isLikelyVercelPreviewHost } from "@/lib/supabase/authErrors";
import { tryCreateBrowserClient } from "@/lib/supabase/client";
import { AuthCard } from "@/components/auth/AuthCard";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const appliedUrlError = useRef(false);

  useEffect(() => {
    if (appliedUrlError.current) return;
    const code = searchParams.get("error");
    const desc = searchParams.get("error_description");
    if (!code) return;
    appliedUrlError.current = true;
    if (code === "auth_callback" && desc) {
      setError(decodeURIComponent(desc.replace(/\+/g, " ")));
      return;
    }
    if (code === "missing_code") {
      setError(
        "The confirmation link was missing its code. Open the latest email link, or sign in if you already confirmed your account.",
      );
      return;
    }
    if (code === "server_config") {
      setError(
        "This deployment is missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Check Vercel environment variables and redeploy.",
      );
      return;
    }
    setError(`Sign-in could not complete (${code}).`);
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const configured = tryCreateBrowserClient();
    if (!configured.ok) {
      setError(configured.error);
      setLoading(false);
      return;
    }
    const supabase = configured.client;

    const { error: signError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signError) {
      const host = typeof window !== "undefined" ? window.location.hostname : "";
      setError(describeSupabaseAuthNetworkError(signError.message, isLikelyVercelPreviewHost(host)));
      return;
    }
    router.replace(redirect);
    router.refresh();
  }

  return (
    <AuthCard title="Log in" subtitle="Access your company dashboard.">
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          />
        </div>
        {error ? (
          <p className="whitespace-pre-wrap rounded-lg border border-red-100 bg-red-50 p-3 text-xs leading-relaxed text-red-800">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-center text-sm text-slate-600">
          New to FieldAI?{" "}
          <Link href="/signup" className="font-semibold text-accent hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
