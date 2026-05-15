"use client";

import { useActionState } from "react";
import { saveCompanyProfile, type SaveCompanyState } from "@/app/dashboard/settings/actions";
import type { Company } from "@/lib/types/database";

const initial: SaveCompanyState = {};

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
  { value: "other", label: "Other" },
];

export function CompanySettingsForm({ company }: { company: Company }) {
  const [state, action] = useActionState(saveCompanyProfile, initial);

  return (
    <form action={action} className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Company profile</h2>
        <p className="mt-1 text-sm text-slate-600">Used across your dashboard and AI receptionist context.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="name">
              Company name
            </label>
            <input
              id="name"
              name="name"
              required
              defaultValue={company.name}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="industry">
              Industry
            </label>
            <select
              id="industry"
              name="industry"
              defaultValue={company.industry ?? "other"}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
            >
              {company.industry && !INDUSTRIES.some((o) => o.value === company.industry) ? (
                <option value={company.industry}>{company.industry} (saved)</option>
              ) : null}
              {INDUSTRIES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="phone">
              Business phone
            </label>
            <input
              id="phone"
              name="phone"
              defaultValue={company.phone ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
            />
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-slate-500">
              Company ID (for voice webhooks): <span className="font-mono text-slate-700">{company.id}</span>
            </p>
            {company.invite_token ? (
              <p className="mt-2 text-xs text-slate-500">
                Invite code: <span className="font-mono font-semibold text-slate-800">{company.invite_token}</span>
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state?.message ? <p className="text-sm text-emerald-700">{state.message}</p> : null}

      <button
        type="submit"
        className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-600"
      >
        Save company
      </button>
    </form>
  );
}
