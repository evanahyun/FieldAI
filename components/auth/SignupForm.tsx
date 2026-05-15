"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { tryCreateBrowserClient } from "@/lib/supabase/client";
import { describeSupabaseAuthNetworkError, isLikelyVercelPreviewHost } from "@/lib/supabase/authErrors";
import { getEmailConfirmationRedirectUrl } from "@/lib/auth/emailRedirect";
import { AuthCard } from "@/components/auth/AuthCard";

type Flow = "create" | "join";

export function SignupForm() {
  const router = useRouter();
  const [flow, setFlow] = useState<Flow>("create");
  const [hasSession, setHasSession] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const r = tryCreateBrowserClient();
    if (!r.ok) {
      setError(r.error);
      return;
    }
    r.client.auth.getUser().then(({ data }) => {
      const u = data.user;
      setHasSession(!!u);
      setSessionEmail(u?.email ?? null);
      if (u?.email) {
        setEmail(u.email);
      }
    });
  }, []);

  const title = hasSession ? "Join a company" : "Create your account";
  const subtitle = hasSession
    ? "Enter an invite code from a company owner, or go to onboarding if you are starting a new workspace."
    : "Sign up, then complete company setup on the next step.";

  async function onSubmitCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    if (hasSession) {
      setLoading(false);
      router.replace("/onboarding");
      return;
    }

    const configured = tryCreateBrowserClient();
    if (!configured.ok) {
      setLoading(false);
      setError(configured.error);
      return;
    }
    const supabase = configured.client;
    const redirectTo = getEmailConfirmationRedirectUrl();
    const { data, error: signError } = await supabase.auth.signUp({
      email,
      password,
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
    });
    if (signError) {
      setLoading(false);
      setError(
        describeSupabaseAuthNetworkError(signError.message, isLikelyVercelPreviewHost(window.location.hostname)),
      );
      return;
    }

    if (!data.session) {
      setLoading(false);
      setMessage(
        "Check your email to confirm your account. After confirming, log in — you will be sent to company onboarding.",
      );
      return;
    }

    setLoading(false);
    router.replace("/onboarding");
    router.refresh();
  }

  async function onSubmitJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const configured = tryCreateBrowserClient();
    if (!configured.ok) {
      setLoading(false);
      setError(configured.error);
      return;
    }
    const supabase = configured.client;

    if (!hasSession) {
      const redirectTo = getEmailConfirmationRedirectUrl();
      const { data, error: signError } = await supabase.auth.signUp({
        email,
        password,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
      });
      if (signError) {
        setLoading(false);
        setError(
          describeSupabaseAuthNetworkError(signError.message, isLikelyVercelPreviewHost(window.location.hostname)),
        );
        return;
      }
      if (!data.session) {
        setLoading(false);
        setMessage("Confirm your email, log in, then use Join again with your invite code.");
        return;
      }
    }

    const { data: companyId, error: rpcError } = await supabase.rpc("join_company_by_invite", {
      p_invite_token: inviteCode.trim(),
    });
    if (rpcError) {
      setLoading(false);
      setError(
        describeSupabaseAuthNetworkError(rpcError.message, isLikelyVercelPreviewHost(window.location.hostname)),
      );
      return;
    }
    if (!companyId) {
      setLoading(false);
      setError("Join failed.");
      return;
    }

    setLoading(false);
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <AuthCard title={title} subtitle={subtitle}>
      <div className="mb-6 flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-sm font-semibold">
        <button
          type="button"
          className={`flex-1 rounded-md px-3 py-2 ${flow === "create" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
          onClick={() => {
            setFlow("create");
            setError(null);
            setMessage(null);
          }}
        >
          New account
        </button>
        <button
          type="button"
          className={`flex-1 rounded-md px-3 py-2 ${flow === "join" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
          onClick={() => {
            setFlow("join");
            setError(null);
            setMessage(null);
          }}
        >
          Join with invite
        </button>
      </div>

      {hasSession ? (
        <p className="mb-4 text-xs text-slate-600">
          Signed in as <span className="font-medium text-slate-900">{sessionEmail}</span>
        </p>
      ) : null}

      {flow === "create" ? (
        <form className="space-y-4" onSubmit={onSubmitCreate}>
          {!hasSession ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700" htmlFor="email">
                  Work email
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
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
                />
                <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>
              </div>
            </>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 disabled:opacity-60"
          >
            {loading ? "Continuing…" : hasSession ? "Go to company onboarding" : "Sign up"}
          </button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={onSubmitJoin}>
          {!hasSession ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700" htmlFor="jemail">
                  Work email
                </label>
                <input
                  id="jemail"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700" htmlFor="jpassword">
                  Password
                </label>
                <input
                  id="jpassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
                />
              </div>
            </>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="invite">
              Invite code
            </label>
            <input
              id="invite"
              required
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Paste code from a company owner"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono outline-none ring-accent focus:ring-2"
            />
            <p className="mt-1 text-xs text-slate-500">Owners can copy this from Settings.</p>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 disabled:opacity-60"
          >
            {loading ? "Joining…" : hasSession ? "Join company" : "Sign up & join company"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-accent hover:underline">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
