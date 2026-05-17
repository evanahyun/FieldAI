import { tryCreateClient } from "@/lib/supabase/server";
import { getDashboardCompanyContext } from "@/lib/company";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { SupabaseConfigError } from "@/components/dashboard/SupabaseConfigError";
import type { Lead } from "@/lib/types/database";

export default async function LeadsPage() {
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

  const { companyId, queryClient } = await getDashboardCompanyContext(supabase, user.id);
  if (!companyId) {
    return null;
  }

  console.info(`[dashboard] using company_id: ${companyId}`);

  const [{ data, error }, callsCountRes] = await Promise.all([
    queryClient
    .from("leads")
    .select("*")
    .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    queryClient.from("calls").select("*", { count: "exact", head: true }).eq("company_id", companyId),
  ]);

  if (error) {
    return <p className="text-sm text-red-600">Could not load leads: {error.message}</p>;
  }

  const leads = (data ?? []) as Lead[];
  console.info(`[dashboard] leads count: ${leads.length}`);
  console.info(`[dashboard] calls count: ${callsCountRes.count ?? 0}`);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Leads</h1>
        <p className="mt-1 text-sm text-slate-600">Job opportunities captured from calls, after-hours messages, and follow-ups.</p>
      </div>
      <LeadsTable leads={leads} />
    </div>
  );
}
