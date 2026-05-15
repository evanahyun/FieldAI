import Link from "next/link";
import { notFound } from "next/navigation";
import { tryCreateClient } from "@/lib/supabase/server";
import { getPrimaryCompanyId } from "@/lib/company";
import { LeadStatusForm } from "@/components/leads/LeadStatusForm";
import { SupabaseConfigError } from "@/components/dashboard/SupabaseConfigError";
import type { Call, Lead } from "@/lib/types/database";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const { data, error } = await supabase.from("leads").select("*").eq("id", id).eq("company_id", companyId).maybeSingle();

  if (error) {
    return <p className="text-sm text-red-600">Could not load lead: {error.message}</p>;
  }

  if (!data) {
    notFound();
  }

  const lead = data as Lead;

  const { data: linkedCall } = await supabase
    .from("calls")
    .select("*")
    .eq("company_id", companyId)
    .eq("lead_id", lead.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const call = linkedCall as Call | null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/dashboard/leads" className="text-sm font-semibold text-accent hover:underline">
            ← Back to leads
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {lead.customer_name ?? "Unknown customer"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{lead.issue_type ?? "General intake"}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <LeadStatusForm key={`${lead.id}-${lead.status}`} leadId={lead.id} initialStatus={lead.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Contact</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Phone</dt>
              <dd className="font-medium text-slate-900">{lead.customer_phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Service address</dt>
              <dd className="font-medium text-slate-900">{lead.service_address ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Preferred time</dt>
              <dd className="font-medium text-slate-900">{lead.preferred_time ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Source</dt>
              <dd className="font-medium text-slate-900">{lead.source ?? "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Triage</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Urgency</dt>
              <dd className="font-medium capitalize text-slate-900">{lead.urgency ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Issue type</dt>
              <dd className="font-medium text-slate-900">{lead.issue_type ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Created</dt>
              <dd className="font-medium text-slate-900">{new Date(lead.created_at).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Updated</dt>
              <dd className="font-medium text-slate-900">
                {new Date(lead.updated_at ?? lead.created_at).toLocaleString()}
              </dd>
            </div>
          </dl>
        </section>

        {call ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-sm font-semibold text-slate-900">Linked call</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Provider</dt>
                <dd className="font-medium text-slate-900">{call.provider ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Caller</dt>
                <dd className="font-medium text-slate-900">{call.caller_phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd className="font-medium text-slate-900">{call.call_status ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Provider call ID</dt>
                <dd className="font-mono text-xs font-medium text-slate-900">{call.provider_call_id ?? "—"}</dd>
              </div>
              {call.recording_url ? (
                <div className="sm:col-span-2">
                  <dt className="text-slate-500">Recording</dt>
                  <dd className="mt-1">
                    <a
                      href={call.recording_url}
                      className="font-semibold text-accent hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open recording
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Call summary</p>
              <p className="mt-1 text-sm text-slate-800">{call.summary ?? "—"}</p>
            </div>
          </section>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">Summary</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{lead.summary ?? "—"}</p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">Transcript</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{lead.transcript ?? "—"}</p>
        </section>
      </div>
    </div>
  );
}
