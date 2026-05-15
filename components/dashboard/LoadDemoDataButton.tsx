"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoadDemoDataButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  async function onClick() {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/dev/load-demo-data", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof body.error === "string" ? body.error : "Request failed");
        return;
      }
      setMessage("Demo leads and calls were added.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4">
      <p className="text-sm font-medium text-slate-800">Development tools</p>
      <p className="mt-1 text-xs text-slate-600">
        Inserts sample leads and calls (HVAC, plumbing, electrical, roofing, landscaping, med spa, cleaning) for your
        company.
      </p>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      {message ? <p className="mt-2 text-xs text-emerald-700">{message}</p> : null}
      <button
        type="button"
        disabled={loading}
        onClick={onClick}
        className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
      >
        {loading ? "Loading…" : "Load demo data"}
      </button>
      <p className="mt-2 text-xs">
        <a href="/dev/test-call" className="font-semibold text-accent hover:underline">
          Open fake call webhook tester →
        </a>
      </p>
    </div>
  );
}
