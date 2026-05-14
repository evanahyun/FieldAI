import Link from "next/link";
import { notFound } from "next/navigation";
import { tryCreateClient } from "@/lib/supabase/server";
import { getPrimaryCompanyId } from "@/lib/company";
import { LeadStatusForm } from "@/components/leads/LeadStatusForm";
import { SupabaseConfigError } from "@/components/dashboard/SupabaseConfigError";
import type { Lead } from "@/lib/types/database";

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
          </dl>
        </section>

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
