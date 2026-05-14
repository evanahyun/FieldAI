"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryCompanyId } from "@/lib/company";

export type SaveSettingsState = { ok?: boolean; error?: string; message?: string };

export async function saveCompanySettings(
  _prev: SaveSettingsState | undefined,
  formData: FormData,
): Promise<SaveSettingsState> {
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
  const tradeType = String(formData.get("trade_type") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  const assistantName = String(formData.get("assistant_name") ?? "").trim();
  const businessHours = String(formData.get("business_hours") ?? "").trim();
  const emergencyRules = String(formData.get("emergency_rules") ?? "").trim();
  const servicesOffered = String(formData.get("services_offered") ?? "").trim();
  const greeting = String(formData.get("greeting") ?? "").trim();
  const fallbackInstructions = String(formData.get("fallback_instructions") ?? "").trim();

  if (!name) {
    return { error: "Company name is required." };
  }

  const { error: companyError } = await supabase
    .from("companies")
    .update({ name, trade_type: tradeType || null, phone: phone || null })
    .eq("id", companyId);

  if (companyError) {
    return { error: companyError.message };
  }

  const { data: existingAi } = await supabase.from("ai_settings").select("id").eq("company_id", companyId).maybeSingle();

  if (existingAi) {
    const { error: aiError } = await supabase
      .from("ai_settings")
      .update({
        assistant_name: assistantName || null,
        business_hours: businessHours || null,
        emergency_rules: emergencyRules || null,
        services_offered: servicesOffered || null,
        greeting: greeting || null,
        fallback_instructions: fallbackInstructions || null,
      })
      .eq("company_id", companyId);

    if (aiError) {
      return { error: aiError.message };
    }
  } else {
    const { error: aiError } = await supabase.from("ai_settings").insert({
      company_id: companyId,
      assistant_name: assistantName || null,
      business_hours: businessHours || null,
      emergency_rules: emergencyRules || null,
      services_offered: servicesOffered || null,
      greeting: greeting || null,
      fallback_instructions: fallbackInstructions || null,
    });

    if (aiError) {
      return { error: aiError.message };
    }
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { ok: true, message: "Settings saved." };
}

export async function loadDemoData(
  _prev: SaveSettingsState | undefined,
  _formData: FormData,
): Promise<SaveSettingsState> {
  if (process.env.NODE_ENV !== "development") {
    return { error: "Demo data loading is only available in development." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const { error } = await supabase.rpc("seed_demo_for_my_company", {
    p_append: process.env.NODE_ENV === "development",
  });
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard/calls");
  revalidatePath("/dashboard/settings");
  return { ok: true, message: "Demo leads and calls were added." };
}
