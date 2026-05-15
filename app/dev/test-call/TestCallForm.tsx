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
  urgency: "low" | "medium" | "high" | "emergency";
  preferred_time: string;
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
    urgency: "medium",
    preferred_time: "Tomorrow afternoon",
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

  async function send() {
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
      const res = await fetch("/api/calls/webhook", {
        method: "POST",
        headers,
        body: JSON.stringify(parsed),
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
        <h1 className="text-2xl font-bold text-slate-900">Test call webhook</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sends a POST to <code className="rounded bg-slate-100 px-1 text-xs">/api/calls/webhook</code> as{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">vapi</code> would. Company ID is pre-filled from your
          logged-in workspace.
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
          placeholder="If CALLS_WEBHOOK_SECRET is set"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm outline-none ring-accent focus:ring-2"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="text-sm font-medium text-slate-700" htmlFor="payload">
          JSON body
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
          onClick={send}
          disabled={loading}
          className="mt-4 w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 disabled:opacity-60"
        >
          {loading ? "Sending…" : "Send test webhook"}
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
