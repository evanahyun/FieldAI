"use client";

import { useActionState, useMemo, useState } from "react";
import { saveAiAgentSettings, type SaveAiState } from "@/app/dashboard/ai-agent/actions";
import { generateReceptionistPrompt } from "@/lib/ai/generateReceptionistPrompt";
import type { AiSettings, Company } from "@/lib/types/database";

const initial: SaveAiState = {};

const isDevRuntime = process.env.NODE_ENV === "development";

function Field({
  id,
  label,
  description,
  children,
}: {
  id: string;
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-800" htmlFor={id}>
        {label}
      </label>
      {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
      {children}
    </div>
  );
}

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

  const [showGeneratedPrompt, setShowGeneratedPrompt] = useState(false);

  const generatedPromptPreview = useMemo(() => {
    if (!isDevRuntime || !showGeneratedPrompt) return "";
    return generateReceptionistPrompt(company, {
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
    });
  }, [
    company,
    showGeneratedPrompt,
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
  ]);

  const sectionClass = "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";
  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-accent focus:ring-2";
  const textareaClass = `${inputClass} resize-y leading-relaxed`;

  return (
    <div className="space-y-8">
      <form action={action} className="space-y-8">
        <section className={sectionClass}>
          <h2 className="text-base font-semibold text-slate-900">Business identity</h2>
          <p className="mt-1 text-sm text-slate-600">How callers should think of your business and who is answering.</p>
          <div className="mt-5 grid gap-4">
            <div>
              <p className="text-sm font-medium text-slate-800">Company name</p>
              <p className="mt-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                {company.name}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {company.industry ? (
                  <>
                    Industry: <span className="font-medium text-slate-700">{company.industry}</span>
                    <span className="text-slate-400"> · </span>
                  </>
                ) : null}
                Name and industry are edited under Dashboard → Settings.
              </p>
            </div>
            <Field id="assistant_name" label="Front desk name">
              <input
                id="assistant_name"
                name="assistant_name"
                value={assistant_name}
                onChange={(e) => setAssistantName(e.target.value)}
                placeholder="e.g. Jordan at dispatch"
                className={inputClass}
              />
            </Field>
            <Field
              id="greeting"
              label="Opening greeting"
              description="First thing callers hear after the line picks up."
            >
              <textarea id="greeting" name="greeting" rows={2} value={greeting} onChange={(e) => setGreeting(e.target.value)} className={textareaClass} />
            </Field>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className="text-base font-semibold text-slate-900">Services offered</h2>
          <p className="mt-1 text-sm text-slate-600">What you want the line to represent—services, areas, or specialties.</p>
          <div className="mt-5">
            <Field id="services_offered" label="Describe your services">
              <textarea
                id="services_offered"
                name="services_offered"
                rows={4}
                value={services_offered}
                onChange={(e) => setServicesOffered(e.target.value)}
                className={textareaClass}
              />
            </Field>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className="text-base font-semibold text-slate-900">Business hours</h2>
          <p className="mt-1 text-sm text-slate-600">When you are normally available and how to talk about scheduling.</p>
          <div className="mt-5">
            <Field id="business_hours" label="Hours & scheduling notes">
              <textarea
                id="business_hours"
                name="business_hours"
                rows={4}
                value={business_hours}
                onChange={(e) => setBusinessHours(e.target.value)}
                placeholder="e.g. Mon–Fri 8–6, emergency line after hours…"
                className={textareaClass}
              />
            </Field>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className="text-base font-semibold text-slate-900">Emergency rules</h2>
          <p className="mt-1 text-sm text-slate-600">
            When something is urgent, an emergency, or needs immediate escalation.
          </p>
          <div className="mt-5">
            <Field
              id="urgency_rules"
              label="Emergency & urgency rules"
              description="Examples help: gas smell, flooding, safety risks, property damage."
            >
              <textarea
                id="urgency_rules"
                name="urgency_rules"
                rows={5}
                value={urgency_rules}
                onChange={(e) => setUrgencyRules(e.target.value)}
                className={textareaClass}
              />
            </Field>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className="text-base font-semibold text-slate-900">Transfer phone number</h2>
          <p className="mt-1 text-sm text-slate-600">Where to send someone who needs a human right away.</p>
          <div className="mt-5">
            <Field id="transfer_phone" label="Transfer or dispatch line" description="Optional.">
              <input
                id="transfer_phone"
                name="transfer_phone"
                value={transfer_phone}
                onChange={(e) => setTransferPhone(e.target.value)}
                placeholder="+1…"
                className={inputClass}
              />
            </Field>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className="text-base font-semibold text-slate-900">Booking preferences</h2>
          <p className="mt-1 text-sm text-slate-600">What the line may promise about visits, windows, or dispatch.</p>
          <div className="mt-5">
            <Field
              id="booking_instructions"
              label="Booking & dispatch rules"
              description="Be explicit about what can and cannot be promised on a live call."
            >
              <textarea
                id="booking_instructions"
                name="booking_instructions"
                rows={4}
                value={booking_instructions}
                onChange={(e) => setBookingInstructions(e.target.value)}
                className={textareaClass}
              />
            </Field>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className="text-base font-semibold text-slate-900">Tone & personality</h2>
          <p className="mt-1 text-sm text-slate-600">How your brand should sound on the phone.</p>
          <div className="mt-5">
            <Field id="tone" label="Tone" description="Short phrases work well.">
              <input
                id="tone"
                name="tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="e.g. calm, confident, neighborly"
                className={inputClass}
              />
            </Field>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className="text-base font-semibold text-slate-900">Information to collect</h2>
          <p className="mt-1 text-sm text-slate-600">What callers should always be asked before the call wraps up.</p>
          <div className="mt-5">
            <Field id="intake_questions" label="Intake checklist">
              <textarea
                id="intake_questions"
                name="intake_questions"
                rows={5}
                value={intake_questions}
                onChange={(e) => setIntakeQuestions(e.target.value)}
                placeholder="Name, phone, address, problem description, preferred callback window…"
                className={textareaClass}
              />
            </Field>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className="text-base font-semibold text-slate-900">After-hours behavior</h2>
          <p className="mt-1 text-sm text-slate-600">What to do when you are closed or the situation is outside normal scope.</p>
          <div className="mt-5">
            <Field
              id="fallback_instructions"
              label="After-hours & fallback behavior"
              description="Voicemail, callback promise, or when to stop troubleshooting."
            >
              <textarea
                id="fallback_instructions"
                name="fallback_instructions"
                rows={4}
                value={fallback_instructions}
                onChange={(e) => setFallbackInstructions(e.target.value)}
                className={textareaClass}
              />
            </Field>
          </div>
        </section>

        {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
        {state?.message ? <p className="text-sm text-emerald-700">{state.message}</p> : null}

        <button
          type="submit"
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-600"
        >
          Save business rules
        </button>
      </form>

      {isDevRuntime ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-amber-950">Developer</h2>
          <p className="mt-1 text-xs text-amber-900/90">
            This block only appears when the app is running in development (<code className="rounded bg-amber-100/80 px-1">NODE_ENV=development</code>). It
            is not included in production builds.
          </p>
          <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm font-medium text-amber-950">
            <input
              type="checkbox"
              checked={showGeneratedPrompt}
              onChange={(e) => setShowGeneratedPrompt(e.target.checked)}
              className="size-4 rounded border-amber-400 text-accent focus:ring-accent"
            />
            Show generated prompt
          </label>
          {showGeneratedPrompt ? (
            <textarea
              readOnly
              className="mt-3 h-80 w-full resize-y rounded-lg border border-amber-200 bg-white p-3 font-mono text-xs leading-relaxed text-slate-800"
              value={generatedPromptPreview}
              spellCheck={false}
            />
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
