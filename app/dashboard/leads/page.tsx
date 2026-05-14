import { tryCreateClient } from "@/lib/supabase/server";
import { getPrimaryCompanyId } from "@/lib/company";
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

  const companyId = await getPrimaryCompanyId(supabase, user.id);
  if (!companyId) {
    return null;
  }

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    return <p className="text-sm text-red-600">Could not load leads: {error.message}</p>;
  }

  const leads = (data ?? []) as Lead[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Leads</h1>
        <p className="mt-1 text-sm text-slate-600">Every AI-qualified job intake tied to your company.</p>
      </div>
      <LeadsTable leads={leads} />
    </div>
  );
}
