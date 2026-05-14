"use client";

import { useState } from "react";

const samplePayload = (companyId: string) => ({
  company_id: companyId,
  caller_phone: "9165551234",
  customer_name: "John Smith",
  service_address: "123 Main St, Sacramento, CA",
  issue_type: "Sewer backup",
  urgency: "emergency" as const,
  preferred_time: "ASAP",
  summary: "Customer has sewage backing up into bathtub.",
  transcript: "Full call transcript here.",
  call_status: "completed",
});

export default function WebhookTester() {
  const [companyId, setCompanyId] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function send() {
    setResult(null);
    if (!companyId.trim()) {
      setResult("Paste a company UUID from Settings first.");
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
        body: JSON.stringify(samplePayload(companyId.trim())),
      });
      const text = await res.text();
      setResult(`${res.status} ${res.statusText}\n${text}`);
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <label className="text-sm font-medium text-slate-700" htmlFor="cid">
          Company ID
        </label>
        <input
          id="cid"
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          placeholder="uuid from Settings"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm outline-none ring-accent focus:ring-2"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700" htmlFor="whsecret">
          Webhook secret (optional)
        </label>
        <input
          id="whsecret"
          type="password"
          autoComplete="off"
          value={webhookSecret}
          onChange={(e) => setWebhookSecret(e.target.value)}
          placeholder="Only if CALLS_WEBHOOK_SECRET is set in .env.local"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm outline-none ring-accent focus:ring-2"
        />
        <p className="mt-1 text-xs text-slate-500">Matches Authorization Bearer for /api/calls/webhook.</p>
      </div>
      <button
        type="button"
        onClick={send}
        disabled={loading}
        className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 disabled:opacity-60"
      >
        {loading ? "Sending…" : "Send test webhook"}
      </button>
      {result ? (
        <pre className="max-h-64 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">{result}</pre>
      ) : null}
    </div>
  );
}
