import Link from "next/link";
import { tryCreateClient } from "@/lib/supabase/server";
import { getPrimaryCompanyId } from "@/lib/company";
import { SupabaseConfigError } from "@/components/dashboard/SupabaseConfigError";
import type { Call } from "@/lib/types/database";

export default async function CallsPage() {
  const client = await tryCreateClient();
  if (!client.ok) {
    return <SupabaseConfigError message={client.error} />;
  }
  const supabase = client.supabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const companyId = await getPrimaryCompanyId(supabase, user.id);
  if (!companyId) {
    return null;
  }

  const { data, error } = await supabase
    .from("calls")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    return <p className="text-sm text-red-600">Could not load calls: {error.message}</p>;
  }

  const calls = (data ?? []) as Call[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Calls</h1>
        <p className="mt-1 text-sm text-slate-600">Answered, missed, and recovered calls for your company.</p>
      </div>

      {calls.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
          No calls yet. Connect your phone line or use the local test page to simulate an inbound call.
          {process.env.NODE_ENV === "development" ? (
            <>
              {" "}
              or use the{" "}
              <Link href="/dev/test-call" className="font-semibold text-accent hover:underline">
                test call page
              </Link>
              .
            </>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          {calls.map((call) => (
            <div key={call.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{call.caller_phone ?? "—"}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Source: <span className="font-medium text-slate-700">{call.provider ?? "—"}</span>
                    {call.provider_call_id ? (
                      <>
                        {" "}
                        · ID: <span className="font-mono text-slate-700">{call.provider_call_id}</span>
                      </>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Status: <span className="font-medium text-slate-700">{call.call_status ?? "—"}</span> · Urgency:{" "}
                    <span className="font-medium capitalize text-slate-700">{call.urgency ?? "—"}</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Service: <span className="font-medium capitalize text-slate-700">{call.service_category ?? "—"}</span>
                    {call.appointment_request ? (
                      <>
                        {" "}
                        · Appointment: <span className="font-medium text-slate-700">{call.appointment_request}</span>
                      </>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Started: {call.started_at ? new Date(call.started_at).toLocaleString() : "—"} · Ended:{" "}
                    {call.ended_at ? new Date(call.ended_at).toLocaleString() : "—"}
                  </p>
                  {call.recording_url ? (
                    <p className="mt-2 text-xs">
                      <a
                        href={call.recording_url}
                        className="font-semibold text-accent hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open recording
                      </a>
                    </p>
                  ) : null}
                </div>
                <div className="text-right text-xs text-slate-500">
                  Logged {new Date(call.created_at).toLocaleString()}
                  {call.lead_id ? (
                    <div className="mt-2">
                      <Link href={`/dashboard/leads/${call.lead_id}`} className="font-semibold text-accent hover:underline">
                        View lead
                      </Link>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Summary</p>
                <p className="mt-1 text-sm text-slate-800">{call.summary ?? "—"}</p>
                {call.internal_notes ? (
                  <>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Office notes</p>
                    <p className="mt-1 text-sm text-slate-800">{call.internal_notes}</p>
                  </>
                ) : null}
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Transcript</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{call.transcript ?? "—"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
