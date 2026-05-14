"use client";

import { useState, useTransition } from "react";
import type { LeadStatus } from "@/lib/types/database";
import { updateLeadStatus } from "@/app/dashboard/leads/[id]/actions";

const statuses: LeadStatus[] = ["New", "Contacted", "Booked", "Closed", "Lost"];

export function LeadStatusForm({ leadId, initialStatus }: { leadId: string; initialStatus: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as LeadStatus;
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await updateLeadStatus(leadId, next);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessage("Saved");
    });
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700" htmlFor="status">
        Status
      </label>
      <select
        id="status"
        defaultValue={initialStatus}
        disabled={pending}
        onChange={onChange}
        className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
      >
        {statuses.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {pending ? <p className="text-xs text-slate-500">Saving…</p> : null}
      {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
