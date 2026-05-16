import Link from "next/link";
import type { Call } from "@/lib/types/database";

export function RecentCalls({ calls }: { calls: Call[] }) {
  if (!calls.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-600">
        No calls logged yet. Answered calls will show summaries and follow-up details here.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">Recent calls</h2>
      </div>
      <ul className="divide-y divide-slate-100">
        {calls.map((call) => (
          <li key={call.id} className="px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{call.caller_phone ?? "Unknown number"}</p>
                <p className="mt-1 text-xs font-medium capitalize text-slate-500">
                  {call.service_category ?? "general service"} · {call.urgency ?? "general inquiry"}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-600">{call.summary ?? "No summary"}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-slate-500">{new Date(call.created_at).toLocaleString()}</p>
                {call.lead_id ? (
                  <Link href={`/dashboard/leads/${call.lead_id}`} className="mt-1 block text-xs font-semibold text-accent hover:underline">
                    View lead
                  </Link>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
