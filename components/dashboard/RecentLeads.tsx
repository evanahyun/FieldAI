import Link from "next/link";
import type { Lead } from "@/lib/types/database";

export function RecentLeads({ leads }: { leads: Lead[] }) {
  if (!leads.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-600">
        No leads yet. New call intakes will appear here as soon as they are captured.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">Recent leads</h2>
      </div>
      <ul className="divide-y divide-slate-100">
        {leads.map((lead) => (
          <li key={lead.id}>
            <Link
              href={`/dashboard/leads/${lead.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-slate-50"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {lead.customer_name ?? "Unknown caller"}
                </p>
                <p className="text-xs text-slate-500">{lead.service_category ?? lead.issue_type ?? "General intake"}</p>
              </div>
              <div className="text-right">
                <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {lead.status}
                </span>
                {lead.source ? <p className="mt-1 text-xs text-slate-500">Source: {lead.source}</p> : null}
                {lead.urgency ? (
                  <p className="mt-1 text-xs capitalize text-slate-500">{lead.urgency}</p>
                ) : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
