import { redirect } from "next/navigation";
import { tryCreateClient } from "@/lib/supabase/server";
import { getPrimaryCompanyId } from "@/lib/company";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { SupabaseConfigError } from "@/components/dashboard/SupabaseConfigError";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const client = await tryCreateClient();
  if (!client.ok) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <SupabaseConfigError message={client.error} />
      </div>
    );
  }
  const supabase = client.supabase;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard");
  }

  const companyId = await getPrimaryCompanyId(supabase, user.id);
  if (!companyId) {
    redirect("/signup?setup=company");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
