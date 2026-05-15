"use client";

import { useActionState, useMemo, useState } from "react";
import { saveAiAgentSettings, type SaveAiState } from "@/app/dashboard/ai-agent/actions";
import { generateReceptionistPrompt } from "@/lib/ai/generateReceptionistPrompt";
import type { AiSettings, Company } from "@/lib/types/database";

const initial: SaveAiState = {};

export function AiAgentSettingsForm({
  company,
  initialAi,
}: {
  company: Company;
  initialAi: AiSettings | null;
}) {
  const [state, action] = useActionState(saveAiAgentSettings, initial);

  const [assistant_name, setAssistantName] = useState(initialAi?.assistant_name ?? "");
  const [greeting, setGreeting] = useState(initialAi?.greeting ?? "");
  const [tone, setTone] = useState(initialAi?.tone ?? "");
  const [business_hours, setBusinessHours] = useState(initialAi?.business_hours ?? "");
  const [services_offered, setServicesOffered] = useState(initialAi?.services_offered ?? "");
  const [intake_questions, setIntakeQuestions] = useState(initialAi?.intake_questions ?? "");
  const [urgency_rules, setUrgencyRules] = useState(initialAi?.urgency_rules ?? "");
  const [fallback_instructions, setFallbackInstructions] = useState(initialAi?.fallback_instructions ?? "");
  const [transfer_phone, setTransferPhone] = useState(initialAi?.transfer_phone ?? "");
  const [booking_instructions, setBookingInstructions] = useState(initialAi?.booking_instructions ?? "");

  const preview = useMemo(
    () =>
      generateReceptionistPrompt(company, {
        assistant_name: assistant_name || null,
        greeting: greeting || null,
        tone: tone || null,
        business_hours: business_hours || null,
        services_offered: services_offered || null,
        intake_questions: intake_questions || null,
        urgency_rules: urgency_rules || null,
        fallback_instructions: fallback_instructions || null,
        transfer_phone: transfer_phone || null,
        booking_instructions: booking_instructions || null,
      }),
    [
      company,
      assistant_name,
      greeting,
      tone,
      business_hours,
      services_offered,
      intake_questions,
      urgency_rules,
      fallback_instructions,
      transfer_phone,
      booking_instructions,
    ],
  );

  return (
    <div className="space-y-8">
      <form action={action} className="space-y-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">AI receptionist</h2>
          <p className="mt-1 text-sm text-slate-600">
            These settings feed the generated prompt you paste into Vapi, Retell, or another voice provider.
          </p>
          <div className="mt-5 grid gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="assistant_name">
                Assistant name
              </label>
              <input
                id="assistant_name"
                name="assistant_name"
                value={assistant_name}
                onChange={(e) => setAssistantName(e.target.value)}
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
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="tone">
                Tone
              </label>
              <input
                id="tone"
                name="tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="e.g. calm, confident, neighborly"
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
                value={business_hours}
                onChange={(e) => setBusinessHours(e.target.value)}
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
                value={services_offered}
                onChange={(e) => setServicesOffered(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="intake_questions">
                Intake questions
              </label>
              <textarea
                id="intake_questions"
                name="intake_questions"
                rows={4}
                value={intake_questions}
                onChange={(e) => setIntakeQuestions(e.target.value)}
                placeholder="What should the agent always ask callers?"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="urgency_rules">
                Urgency rules
              </label>
              <textarea
                id="urgency_rules"
                name="urgency_rules"
                rows={4}
                value={urgency_rules}
                onChange={(e) => setUrgencyRules(e.target.value)}
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
                value={fallback_instructions}
                onChange={(e) => setFallbackInstructions(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="transfer_phone">
                Transfer phone
              </label>
              <input
                id="transfer_phone"
                name="transfer_phone"
                value={transfer_phone}
                onChange={(e) => setTransferPhone(e.target.value)}
                placeholder="Human dispatch line (optional)"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="booking_instructions">
                Booking instructions
              </label>
              <textarea
                id="booking_instructions"
                name="booking_instructions"
                rows={3}
                value={booking_instructions}
                onChange={(e) => setBookingInstructions(e.target.value)}
                placeholder="When may the agent suggest times or dispatch?"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
              />
            </div>
          </div>
        </section>

        {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
        {state?.message ? <p className="text-sm text-emerald-700">{state.message}</p> : null}

        <button
          type="submit"
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-600"
        >
          Save AI settings
        </button>
      </form>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Generated receptionist prompt</h2>
        <p className="mt-1 text-sm text-slate-600">Updates as you edit fields above (before save).</p>
        <textarea
          readOnly
          className="mt-4 h-96 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-800"
          value={preview}
        />
      </section>
    </div>
  );
}
