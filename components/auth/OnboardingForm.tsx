"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tryCreateBrowserClient } from "@/lib/supabase/client";
import { AuthCard } from "@/components/auth/AuthCard";

const INDUSTRIES = [
  { value: "plumbing", label: "Plumbing" },
  { value: "hvac", label: "HVAC" },
  { value: "electrical", label: "Electrical" },
  { value: "roofing", label: "Roofing" },
  { value: "landscaping", label: "Landscaping" },
  { value: "cleaning", label: "Cleaning" },
  { value: "general_contractor", label: "General contractor" },
  { value: "med_spa", label: "Med spa / aesthetics" },
  { value: "auto_repair", label: "Auto repair" },
  { value: "wellness", label: "Wellness / fitness" },
  { value: "other", label: "Other local services" },
];

export function OnboardingForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("plumbing");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const configured = tryCreateBrowserClient();
    if (!configured.ok) {
      setLoading(false);
      setError(configured.error);
      return;
    }
    const supabase = configured.client;
    const { data, error: rpcError } = await supabase.rpc("create_company_with_owner", {
      p_name: name.trim(),
      p_industry: industry.trim(),
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
      title="Set up your company"
      subtitle="Tell us the basics so call intake and your dashboard are set up correctly."
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
            placeholder="Summit Valley Plumbing"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="industry">
            Industry
          </label>
          <select
            id="industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          >
            {INDUSTRIES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
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
