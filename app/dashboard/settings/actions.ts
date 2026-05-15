"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryCompanyId } from "@/lib/company";

export type SaveCompanyState = { ok?: boolean; error?: string; message?: string };

export async function saveCompanyProfile(
  _prev: SaveCompanyState | undefined,
  formData: FormData,
): Promise<SaveCompanyState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const companyId = await getPrimaryCompanyId(supabase, user.id);
  if (!companyId) {
    return { error: "No company found for this account." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!name) {
    return { error: "Company name is required." };
  }

  const { error: companyError } = await supabase
    .from("companies")
    .update({ name, industry: industry || null, phone: phone || null })
    .eq("id", companyId);

  if (companyError) {
    return { error: companyError.message };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/ai-agent");
  return { ok: true, message: "Company profile saved." };
}
