import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getPrimaryCompanyId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("company_users")
    .select("company_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return data.company_id;
}

export async function getDashboardCompanyContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<{
  companyId: string | null;
  queryClient: SupabaseClient;
  primaryCompanyId: string | null;
  fallbackCompanyId: string | null;
  usingDevFallback: boolean;
}> {
  const primaryCompanyId = await getPrimaryCompanyId(supabase, userId);

  if (process.env.NODE_ENV === "production") {
    return {
      companyId: primaryCompanyId,
      queryClient: supabase,
      primaryCompanyId,
      fallbackCompanyId: null,
      usingDevFallback: false,
    };
  }

  try {
    const admin = createAdminClient();
    const { data: fallbackCompany, error } = await admin
      .from("companies")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("[dashboard] dev fallback company lookup failed", error);
    }

    const fallbackCompanyId = fallbackCompany?.id ?? null;
    console.info("[dashboard] primary company_id:", primaryCompanyId ?? "none");
    console.info("[dashboard] dev fallback company_id:", fallbackCompanyId ?? "none");

    if (fallbackCompanyId && fallbackCompanyId !== primaryCompanyId) {
      return {
        companyId: fallbackCompanyId,
        queryClient: admin,
        primaryCompanyId,
        fallbackCompanyId,
        usingDevFallback: true,
      };
    }

    return {
      companyId: primaryCompanyId ?? fallbackCompanyId,
      queryClient: primaryCompanyId ? supabase : admin,
      primaryCompanyId,
      fallbackCompanyId,
      usingDevFallback: !primaryCompanyId && Boolean(fallbackCompanyId),
    };
  } catch (e) {
    console.warn("[dashboard] dev fallback company unavailable", e);
    return {
      companyId: primaryCompanyId,
      queryClient: supabase,
      primaryCompanyId,
      fallbackCompanyId: null,
      usingDevFallback: false,
    };
  }
}
