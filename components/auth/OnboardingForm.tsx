"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthCard } from "@/components/auth/AuthCard";

export function OnboardingForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [tradeType, setTradeType] = useState("trenchless_sewer");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("create_company_with_owner", {
      p_name: name.trim(),
      p_trade_type: tradeType.trim(),
      p_phone: phone.trim() || "",
    });
    setLoading(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    if (!data) {
      setError("Could not create company. Try again.");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <AuthCard
      title="Create your company"
      subtitle="This workspace is private to your team. You can invite teammates later."
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="company">
            Company name
          </label>
          <input
            id="company"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="TrenchFlow Sewer Co."
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
            placeholder="(555) 010-2030"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 disabled:opacity-60"
        >
          {loading ? "Saving…" : "Continue to dashboard"}
        </button>
      </form>
    </AuthCard>
  );
}
