"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryCompanyId } from "@/lib/company";
import type { LeadStatus } from "@/lib/types/database";

const ALLOWED: LeadStatus[] = ["new", "qualified", "booked", "awaiting confirmation", "needs follow-up", "follow-up", "missed", "closed"];

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!ALLOWED.includes(status)) {
    return { ok: false, error: "Invalid status." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const companyId = await getPrimaryCompanyId(supabase, user.id);
  if (!companyId) {
    return { ok: false, error: "No company found." };
  }

  const { error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", leadId)
    .eq("company_id", companyId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leads");
  revalidatePath(`/dashboard/leads/${leadId}`);
  return { ok: true };
}
