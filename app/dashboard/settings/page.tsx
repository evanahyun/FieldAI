import { tryCreateClient } from "@/lib/supabase/server";
import { getPrimaryCompanyId } from "@/lib/company";
import { CompanySettingsForm } from "@/components/dashboard/CompanySettingsForm";
import { SupabaseConfigError } from "@/components/dashboard/SupabaseConfigError";
import { getPublicAppOrigin } from "@/lib/site/publicOrigin";
import type { Company } from "@/lib/types/database";

export default async function SettingsPage() {
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

  const { data: company, error: companyError } = await supabase.from("companies").select("*").eq("id", companyId).single();

  if (companyError || !company) {
    return <p className="text-sm text-red-600">Could not load company: {companyError?.message ?? "Unknown error"}</p>;
  }

  const publicAppOrigin = getPublicAppOrigin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">Company profile and workspace identifiers.</p>
      </div>
      <CompanySettingsForm company={company as Company} publicAppOrigin={publicAppOrigin} />
    </div>
  );
}
