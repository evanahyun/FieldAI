"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Payload = {
  company_id: string;
  provider: string;
  provider_call_id: string;
  caller_phone: string;
  customer_name: string;
  service_address: string;
  issue_type: string;
  service_category?: string;
  problem_description?: string;
  urgency: "general inquiry" | "scheduled" | "same-day" | "emergency";
  preferred_time: string;
  appointment_request?: string;
  internal_notes?: string;
  summary: string;
  transcript: string;
  recording_url: string;
  call_status: string;
};

function defaultPayload(companyId: string): Payload {
  return {
    company_id: companyId,
    provider: "vapi",
    provider_call_id: `test-${Date.now()}`,
    caller_phone: "+14155550100",
    customer_name: "Test Caller",
    service_address: "123 Market St, San Francisco, CA",
    issue_type: "Test intake — water heater noise",
    service_category: "plumbing",
    problem_description: "Customer reports intermittent rumbling from the water heater for two days.",
    urgency: "scheduled",
    preferred_time: "Tomorrow afternoon",
    appointment_request: "Customer wants an appointment tomorrow afternoon.",
    internal_notes: "No visible leak reported. Confirm water heater age during follow-up.",
    summary: "Test webhook call: customer reports intermittent rumbling from water heater.",
    transcript: "Agent: How long has the noise been happening?\nCaller: About two days.\nAgent: Any leaks visible?\nCaller: Not yet.",
    recording_url: "",
    call_status: "completed",
  };
}

export default function TestCallForm({ companyId }: { companyId: string }) {
  const [jsonText, setJsonText] = useState(() => JSON.stringify(defaultPayload(companyId), null, 2));
  const [webhookSecret, setWebhookSecret] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [leadLink, setLeadLink] = useState<string | null>(null);

  const parsed = useMemo(() => {
    try {
      return JSON.parse(jsonText) as Payload;
    } catch {
      return null;
    }
  }, [jsonText]);

  function asMockVapiEvent(payload: Payload) {
    return {
      message: {
        type: "end-of-call-report",
        endedReason: payload.call_status,
        call: {
          id: payload.provider_call_id,
          status: payload.call_status,
          startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          endedAt: new Date().toISOString(),
          customer: { number: payload.caller_phone },
          metadata: { company_id: payload.company_id },
        },
        summary: payload.summary,
        artifact: {
          transcript: payload.transcript,
          recording: {},
        },
      },
    };
  }

  async function send(target: "generic" | "vapi") {
    setResult(null);
    setLeadLink(null);
    if (!parsed) {
      setResult("Invalid JSON — fix syntax before sending.");
      return;
    }
    setLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (webhookSecret.trim()) {
        headers.Authorization = `Bearer ${webhookSecret.trim()}`;
      }
      const res = await fetch(target === "generic" ? "/api/calls/webhook" : "/api/vapi/webhook", {
        method: "POST",
        headers,
        body: JSON.stringify(target === "generic" ? parsed : asMockVapiEvent(parsed)),
      });
      const text = await res.text();
      setResult(`${res.status} ${res.statusText}\n${text}`);
      if (res.ok) {
        const body = JSON.parse(text) as { lead_id?: string };
        if (body.lead_id) {
          setLeadLink(`/dashboard/leads/${body.lead_id}`);
        }
      }
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Test inbound call</h1>
        <p className="mt-2 text-sm text-slate-600">
          Send a sample call into the local intake flow. Company ID is pre-filled from your logged-in workspace. When
          <code className="ml-1 rounded bg-slate-100 px-1 text-xs">VAPI_WEBHOOK_SECRET</code> is not set locally, the Vapi
          test endpoint accepts requests without a secret.
        </p>
        <p className="mt-2 text-sm">
          <Link href="/dashboard" className="font-semibold text-accent hover:underline">
            ← Back to dashboard
          </Link>
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="text-sm font-medium text-slate-700" htmlFor="whsecret">
          Webhook secret (optional)
        </label>
        <input
          id="whsecret"
          type="password"
          autoComplete="off"
          value={webhookSecret}
          onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="If a webhook secret is set"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm outline-none ring-accent focus:ring-2"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="text-sm font-medium text-slate-700" htmlFor="payload">
          Sample call details
        </label>
        <textarea
          id="payload"
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          rows={22}
          className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-900"
        />
        <button
          type="button"
          onClick={() => send("generic")}
          disabled={loading}
          className="mt-4 w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 disabled:opacity-60"
        >
          {loading ? "Sending…" : "Send generic test call"}
        </button>
        <button
          type="button"
          onClick={() => send("vapi")}
          disabled={loading}
          className="mt-3 w-full rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-60"
        >
          {loading ? "Sending…" : "Simulate Vapi end-of-call"}
        </button>
        {result ? (
          <pre className="mt-4 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
            {result}
          </pre>
        ) : null}
        {leadLink ? (
          <p className="mt-4 text-sm font-semibold">
            <Link href={leadLink} className="text-accent hover:underline">
              Open created lead →
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
