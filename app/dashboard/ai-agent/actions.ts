"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryCompanyId } from "@/lib/company";

export type SaveAiState = { ok?: boolean; error?: string; message?: string };

export async function saveAiAgentSettings(
  _prev: SaveAiState | undefined,
  formData: FormData,
): Promise<SaveAiState> {
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

  const row = {
    assistant_name: str(formData, "assistant_name"),
    greeting: str(formData, "greeting"),
    tone: str(formData, "tone"),
    business_hours: str(formData, "business_hours"),
    services_offered: str(formData, "services_offered"),
    intake_questions: str(formData, "intake_questions"),
    urgency_rules: str(formData, "urgency_rules"),
    fallback_instructions: str(formData, "fallback_instructions"),
    transfer_phone: str(formData, "transfer_phone"),
    booking_instructions: str(formData, "booking_instructions"),
  };

  const { data: existing } = await supabase.from("ai_settings").select("id").eq("company_id", companyId).maybeSingle();

  if (existing) {
    const { error } = await supabase.from("ai_settings").update(row).eq("company_id", companyId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("ai_settings").insert({ company_id: companyId, ...row });
    if (error) return { error: error.message };
  }

  revalidatePath("/dashboard/ai-agent");
  revalidatePath("/dashboard");
  return { ok: true, message: "Business rules saved." };
}

function str(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v ? v : null;
}
