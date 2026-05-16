import { tryCreateClient } from "@/lib/supabase/server";
import { getPrimaryCompanyId } from "@/lib/company";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentLeads } from "@/components/dashboard/RecentLeads";
import { RecentCalls } from "@/components/dashboard/RecentCalls";
import { LoadDemoDataButton } from "@/components/dashboard/LoadDemoDataButton";
import { SupabaseConfigError } from "@/components/dashboard/SupabaseConfigError";
import type { Call, Lead } from "@/lib/types/database";

const DEFAULT_AVERAGE_JOB_VALUE = 350;
const PIPELINE_STATUSES = ["new", "qualified", "booked", "awaiting confirmation", "needs follow-up", "missed", "closed"];

function statusCount(leads: Lead[], status: string): number {
  return leads.filter((lead) => lead.status.toLowerCase() === status).length;
}

function hasCallStatus(call: Call, terms: string[]): boolean {
  const status = call.call_status?.toLowerCase() ?? "";
  return terms.some((term) => status.includes(term));
}

function topTags(leads: Lead[], field: "urgency" | "service_category" | "issue_type", limit = 5) {
  const counts = new Map<string, number>();
  leads.forEach((lead) => {
    const value = lead[field]?.trim();
    if (!value) return;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

export default async function DashboardHomePage() {
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

  const [
    leadsRes,
    callsRes,
    appointmentsRes,
    recentLeadsRes,
    recentCallsRes,
  ] = await Promise.all([
    supabase.from("leads").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(200),
    supabase.from("calls").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(200),
    supabase.from("appointments").select("*").eq("company_id", companyId).limit(200),
    supabase
      .from("leads")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("calls")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const leads = (leadsRes.data ?? []) as Lead[];
  const calls = (callsRes.data ?? []) as Call[];
  const recentLeads = (recentLeadsRes.data ?? []) as Lead[];
  const recentCalls = (recentCallsRes.data ?? []) as Call[];
  const appointments = appointmentsRes.data ?? [];

  const totalCalls = calls.length;
  const newLeads = statusCount(leads, "new");
  const bookedJobs = statusCount(leads, "booked") || appointments.filter((a) => String(a.status).toLowerCase() === "booked").length;
  const missedCalls = calls.filter((call) => hasCallStatus(call, ["missed", "no-answer", "no_answer"])).length;
  const abandonedCalls = calls.filter((call) => hasCallStatus(call, ["abandoned", "hangup", "ended-by-customer"])).length;
  const estimatedRecoveredRevenue = bookedJobs * DEFAULT_AVERAGE_JOB_VALUE;
  const urgencyTags = topTags(leads, "urgency");
  const serviceTags = topTags(leads, "service_category");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">Calls, leads, bookings, and missed revenue in one place.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total calls" value={totalCalls} />
        <StatCard label="New leads" value={newLeads} />
        <StatCard label="Booked jobs" value={bookedJobs} />
        <StatCard label="Missed calls" value={missedCalls} />
        <StatCard label="Abandoned calls" value={abandonedCalls} />
        <StatCard label="Recovered revenue" value={`$${estimatedRecoveredRevenue.toLocaleString()}`} hint="$350 average job value." />
      </div>

      <LoadDemoDataButton />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">Lead pipeline</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PIPELINE_STATUSES.map((status) => (
              <div key={status} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-medium capitalize text-slate-500">{status}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{statusCount(leads, status)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Call tags</h2>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Urgency</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {urgencyTags.length ? urgencyTags.map(([tag, count]) => (
                  <span key={tag} className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium capitalize text-orange-800">
                    {tag} · {count}
                  </span>
                )) : <span className="text-xs text-slate-500">No tags yet</span>}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Service</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {serviceTags.length ? serviceTags.map(([tag, count]) => (
                  <span key={tag} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium capitalize text-blue-800">
                    {tag} · {count}
                  </span>
                )) : <span className="text-xs text-slate-500">No service tags yet</span>}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentLeads leads={recentLeads} />
        <RecentCalls calls={recentCalls} />
      </div>
    </div>
  );
}
