import { redirect } from "next/navigation";
import { tryCreateClient } from "@/lib/supabase/server";
import { getPrimaryCompanyId } from "@/lib/company";
import TestCallForm from "./TestCallForm";
import { SupabaseConfigError } from "@/components/dashboard/SupabaseConfigError";

export default async function TestCallPage() {
  if (process.env.NODE_ENV === "production") {
    redirect("/dashboard");
  }

  const client = await tryCreateClient();
  if (!client.ok) {
    return <SupabaseConfigError message={client.error} />;
  }
  const supabase = client.supabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/dev/test-call");
  }

  const companyId = await getPrimaryCompanyId(supabase, user.id);
  if (!companyId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-sm text-slate-700">
        Join or create a company first, then return here.
      </div>
    );
  }

  return <TestCallForm companyId={companyId} />;
}
