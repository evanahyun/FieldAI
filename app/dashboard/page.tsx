import { tryCreateClient } from "@/lib/supabase/server";
import { getPrimaryCompanyId } from "@/lib/company";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentLeads } from "@/components/dashboard/RecentLeads";
import { RecentCalls } from "@/components/dashboard/RecentCalls";
import { SupabaseConfigError } from "@/components/dashboard/SupabaseConfigError";
import type { Call, Lead } from "@/lib/types/database";

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

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();

  const [
    totalLeadsRes,
    urgentLeadsRes,
    newLeadsRes,
    newCallsRes,
    bookedAppointmentsRes,
    recentLeadsRes,
    recentCallsRes,
  ] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("company_id", companyId),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .in("urgency", ["high", "emergency"])
      .not("status", "eq", "Closed")
      .not("status", "eq", "Lost"),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "New"),
    supabase
      .from("calls")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .gte("created_at", since24h),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "scheduled")
      .gte("appointment_time", nowIso),
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

  const totalLeads = totalLeadsRes.count ?? 0;
  const urgentLeads = urgentLeadsRes.count ?? 0;
  const newLeads = newLeadsRes.count ?? 0;
  const newCalls = newCallsRes.count ?? 0;
  const bookedAppointments = bookedAppointmentsRes.count ?? 0;
  const recentLeads = (recentLeadsRes.data ?? []) as Lead[];
  const recentCalls = (recentCallsRes.data ?? []) as Call[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">Operational snapshot for your dispatch desk.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total leads" value={totalLeads} />
        <StatCard label="Urgent leads" value={urgentLeads} hint="High or emergency, excluding closed/lost." />
        <StatCard label="New leads" value={newLeads} hint='Status is "New".' />
        <StatCard label="New calls (24h)" value={newCalls} />
        <StatCard label="Booked appointments" value={bookedAppointments} hint="Scheduled visits with a future time." />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentLeads leads={recentLeads} />
        <RecentCalls calls={recentCalls} />
      </div>
    </div>
  );
}
