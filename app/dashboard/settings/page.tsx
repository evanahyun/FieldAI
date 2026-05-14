import { tryCreateClient } from "@/lib/supabase/server";
import { getPrimaryCompanyId } from "@/lib/company";
import { SettingsForm } from "@/components/dashboard/SettingsForm";
import { SupabaseConfigError } from "@/components/dashboard/SupabaseConfigError";
import type { AiSettings, Company } from "@/lib/types/database";

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

  const [{ data: company, error: companyError }, { data: ai, error: aiError }] = await Promise.all([
    supabase.from("companies").select("*").eq("id", companyId).single(),
    supabase.from("ai_settings").select("*").eq("company_id", companyId).maybeSingle(),
  ]);

  if (companyError || !company) {
    return <p className="text-sm text-red-600">Could not load company: {companyError?.message ?? "Unknown error"}</p>;
  }

  if (aiError) {
    return <p className="text-sm text-red-600">Could not load AI settings: {aiError.message}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">Company profile and AI receptionist instructions.</p>
      </div>
      <SettingsForm company={company as Company} ai={ai as AiSettings | null} />
    </div>
  );
}
