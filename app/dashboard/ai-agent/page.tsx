import { tryCreateClient } from "@/lib/supabase/server";
import { getPrimaryCompanyId } from "@/lib/company";
import { AiAgentSettingsForm } from "@/components/dashboard/AiAgentSettingsForm";
import { SupabaseConfigError } from "@/components/dashboard/SupabaseConfigError";
import type { AiSettings, Company } from "@/lib/types/database";

export default async function AiAgentPage() {
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

  const [{ data: company, error: cErr }, { data: ai, error: aErr }] = await Promise.all([
    supabase.from("companies").select("*").eq("id", companyId).single(),
    supabase.from("ai_settings").select("*").eq("company_id", companyId).maybeSingle(),
  ]);

  if (cErr || !company) {
    return <p className="text-sm text-red-600">Could not load company: {cErr?.message ?? "Unknown"}</p>;
  }
  if (aErr) {
    return <p className="text-sm text-red-600">Could not load AI settings: {aErr.message}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">AI agent</h1>
        <p className="mt-1 text-sm text-slate-600">Configure how your phone agent represents {company.name}.</p>
      </div>
      <AiAgentSettingsForm company={company as Company} initialAi={ai as AiSettings | null} />
    </div>
  );
}
