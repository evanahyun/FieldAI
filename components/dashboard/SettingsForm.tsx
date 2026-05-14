"use client";

import { useActionState } from "react";
import { loadDemoData, saveCompanySettings, type SaveSettingsState } from "@/app/dashboard/settings/actions";
import type { AiSettings, Company } from "@/lib/types/database";

const initial: SaveSettingsState = {};

export function SettingsForm({
  company,
  ai,
}: {
  company: Company;
  ai: AiSettings | null;
}) {
  const [saveState, saveAction] = useActionState(saveCompanySettings, initial);
  const [demoState, demoAction] = useActionState(loadDemoData, initial);

  return (
    <div className="space-y-8">
      <form action={saveAction} className="space-y-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Company</h2>
          <p className="mt-1 text-sm text-slate-600">Basics shown on your account and used for dispatch context.</p>
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
              <label className="text-sm font-medium text-slate-700" htmlFor="trade_type">
                Trade type
              </label>
              <input
                id="trade_type"
                name="trade_type"
                defaultValue={company.trade_type ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
              />
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
                Company ID (for webhooks): <span className="font-mono text-slate-700">{company.id}</span>
              </p>
              {company.invite_token ? (
                <p className="mt-2 text-xs text-slate-500">
                  Invite code (share with teammates):{" "}
                  <span className="font-mono font-semibold text-slate-800">{company.invite_token}</span>
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">AI receptionist</h2>
          <p className="mt-1 text-sm text-slate-600">
            These fields are designed to be pasted into your Vapi or Retell agent configuration as business context.
          </p>
          <div className="mt-5 grid gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="assistant_name">
                Assistant name
              </label>
              <input
                id="assistant_name"
                name="assistant_name"
                defaultValue={ai?.assistant_name ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="business_hours">
                Business hours
              </label>
              <textarea
                id="business_hours"
                name="business_hours"
                rows={3}
                defaultValue={ai?.business_hours ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="emergency_rules">
                Emergency rules
              </label>
              <textarea
                id="emergency_rules"
                name="emergency_rules"
                rows={3}
                defaultValue={ai?.emergency_rules ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="services_offered">
                Services offered
              </label>
              <textarea
                id="services_offered"
                name="services_offered"
                rows={3}
                defaultValue={ai?.services_offered ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="greeting">
                Greeting
              </label>
              <textarea
                id="greeting"
                name="greeting"
                rows={2}
                defaultValue={ai?.greeting ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="fallback_instructions">
                Fallback instructions
              </label>
              <textarea
                id="fallback_instructions"
                name="fallback_instructions"
                rows={3}
                defaultValue={ai?.fallback_instructions ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
              />
            </div>
          </div>
        </section>

        {saveState?.error ? <p className="text-sm text-red-600">{saveState.error}</p> : null}
        {saveState?.message ? <p className="text-sm text-emerald-700">{saveState.message}</p> : null}

        <button
          type="submit"
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-600"
        >
          Save settings
        </button>
      </form>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Demo data</h2>
        <p className="mt-1 text-sm text-slate-600">
          In development, this adds four realistic Sacramento-area leads plus linked calls and sample appointments. You can run it multiple times while testing.
        </p>
        {process.env.NODE_ENV === "development" ? (
          <form action={demoAction} className="mt-4">
            {demoState?.error ? <p className="mb-2 text-sm text-red-600">{demoState.error}</p> : null}
            {demoState?.message ? <p className="mb-2 text-sm text-emerald-700">{demoState.message}</p> : null}
            <button
              type="submit"
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Load Demo Data
            </button>
          </form>
        ) : (
          <p className="mt-4 text-xs text-slate-500">Demo seeding is only available in local development builds.</p>
        )}
        {process.env.NODE_ENV === "development" ? (
          <p className="mt-4 text-sm">
            <a href="/dev/test-webhook" className="font-semibold text-accent hover:underline">
              Open webhook test page →
            </a>
          </p>
        ) : null}
      </section>
    </div>
  );
}
