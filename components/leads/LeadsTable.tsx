import Link from "next/link";
import type { Lead } from "@/lib/types/database";

export function LeadsTable({ leads }: { leads: Lead[] }) {
  if (!leads.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
        No leads yet. In development, use <span className="font-semibold text-slate-800">Load demo data</span> on the
        dashboard or send a sample call from the{" "}
        <a className="font-semibold text-accent hover:underline" href="/dev/test-call">test call page</a>.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-3">Customer</th>
            <th className="px-5 py-3">Service</th>
            <th className="px-5 py-3">Problem</th>
            <th className="px-5 py-3">Urgency</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Appointment</th>
            <th className="px-5 py-3">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-slate-50">
              <td className="px-5 py-4">
                <Link href={`/dashboard/leads/${lead.id}`} className="font-semibold text-accent hover:underline">
                  {lead.customer_name ?? "Unknown"}
                </Link>
                <p className="text-xs text-slate-500">{lead.customer_phone ?? "—"}</p>
              </td>
              <td className="px-5 py-4 capitalize text-slate-700">{lead.service_category ?? lead.issue_type ?? "—"}</td>
              <td className="px-5 py-4 text-slate-700">{lead.problem_description ?? lead.issue_type ?? "—"}</td>
              <td className="px-5 py-4 capitalize text-slate-700">{lead.urgency ?? "—"}</td>
              <td className="px-5 py-4">
                <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800">
                  {lead.status}
                </span>
              </td>
              <td className="px-5 py-4 text-xs text-slate-600">{lead.appointment_request ?? lead.preferred_time ?? "—"}</td>
              <td className="px-5 py-4 text-xs text-slate-500">{new Date(lead.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
