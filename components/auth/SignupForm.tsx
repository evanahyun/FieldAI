"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthCard } from "@/components/auth/AuthCard";

type Flow = "create" | "join";

export function SignupForm({ setupCompany }: { setupCompany: boolean }) {
  const router = useRouter();
  const [flow, setFlow] = useState<Flow>("create");
  const [hasSession, setHasSession] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [tradeType, setTradeType] = useState("trenchless_sewer");
  const [phone, setPhone] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setHasSession(!!u);
      setSessionEmail(u?.email ?? null);
      if (u?.email) {
        setEmail(u.email);
      }
    });
  }, []);

  const title = setupCompany || hasSession ? "Finish workspace setup" : "Create your account";
  const subtitle =
    setupCompany || hasSession
      ? "Create a new company or join an existing one with an invite code from an owner."
      : "Create your company and start receiving AI-qualified leads.";

  async function createCompanyForSessionUser() {
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("create_company_with_owner", {
      p_name: companyName.trim(),
      p_trade_type: tradeType.trim(),
      p_phone: phone.trim(),
    });
    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }
    if (!data) {
      setError("Could not create company.");
      setLoading(false);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  async function joinWithSessionUser() {
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("join_company_by_invite", {
      p_invite_token: inviteCode.trim(),
    });
    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }
    if (!data) {
      setError("Join failed.");
      setLoading(false);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  async function onSubmitCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    if (hasSession) {
      await createCompanyForSessionUser();
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data, error: signError } = await supabase.auth.signUp({ email, password });
    if (signError) {
      setLoading(false);
      setError(signError.message);
      return;
    }

    if (!data.session) {
      setLoading(false);
      setMessage("Check your email to confirm your account. After confirming, log in and you can finish company setup.");
      return;
    }

    const { data: companyId, error: rpcError } = await supabase.rpc("create_company_with_owner", {
      p_name: companyName.trim(),
      p_trade_type: tradeType.trim(),
      p_phone: phone.trim(),
    });

    if (rpcError) {
      setLoading(false);
      setError(rpcError.message);
      return;
    }
    if (!companyId) {
      setLoading(false);
      setError("Could not create company.");
      return;
    }

    setLoading(false);
    router.replace("/dashboard");
    router.refresh();
  }

  async function onSubmitJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const supabase = createClient();

    if (!hasSession) {
      const { data, error: signError } = await supabase.auth.signUp({ email, password });
      if (signError) {
        setLoading(false);
        setError(signError.message);
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
      setError(rpcError.message);
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
          Create company
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
                  required={!hasSession}
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
                />
                <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>
              </div>
            </>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="company">
              Company name
            </label>
            <input
              id="company"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Field Plumbing Co."
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="trade">
              Trade type
            </label>
            <select
              id="trade"
              value={tradeType}
              onChange={(e) => setTradeType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
            >
              <option value="plumbing">Plumbing</option>
              <option value="trenchless_sewer">Trenchless sewer</option>
              <option value="hvac">HVAC</option>
              <option value="general_contractor">General contractor</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="phone">
              Main business phone
            </label>
            <input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(916) 555-0100"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 disabled:opacity-60"
          >
            {loading ? "Saving…" : hasSession ? "Create workspace" : "Sign up & create workspace"}
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
            <p className="mt-1 text-xs text-slate-500">Owners can copy this from Settings after running the latest database SQL.</p>
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
