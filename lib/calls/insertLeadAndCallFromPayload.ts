import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CallWebhookPayload } from "@/lib/types/database";

type LeadsInsert = Database["public"]["Tables"]["leads"]["Insert"];
type CallsInsert = Database["public"]["Tables"]["calls"]["Insert"];

export type InsertLeadAndCallResult =
  | { ok: true; lead_id: string; call_id: string; deduped: boolean }
  | { ok: false; status: number; error: string };

export type InsertLeadAndCallOptions = {
  started_at?: string | null;
  ended_at?: string | null;
};

/**
 * Creates a lead + call from the canonical webhook payload.
 * Idempotent on (company_id, provider, provider_call_id).
 */
export async function insertLeadAndCallFromPayload(
  admin: SupabaseClient<Database>,
  p: CallWebhookPayload,
  opts?: InsertLeadAndCallOptions,
): Promise<InsertLeadAndCallResult> {
  const { data: existing } = await admin
    .from("calls")
    .select("id, lead_id")
    .eq("company_id", p.company_id)
    .eq("provider", p.provider)
    .eq("provider_call_id", p.provider_call_id)
    .maybeSingle();

  if (existing?.id && existing.lead_id) {
    return { ok: true, lead_id: existing.lead_id, call_id: existing.id, deduped: true };
  }

  const { data: company, error: companyError } = await admin.from("companies").select("id").eq("id", p.company_id).maybeSingle();

  if (companyError) {
    return { ok: false, status: 500, error: companyError.message };
  }
  if (!company) {
    return { ok: false, status: 404, error: "Unknown company_id" };
  }

  const nowIso = new Date().toISOString();
  const started = opts?.started_at ?? nowIso;
  const ended = opts?.ended_at ?? nowIso;

  const leadRow: LeadsInsert = {
    company_id: p.company_id,
    customer_name: p.customer_name,
    customer_phone: p.caller_phone,
    service_address: p.service_address,
    issue_type: p.issue_type,
    urgency: p.urgency,
    status: "New",
    preferred_time: p.preferred_time,
    summary: p.summary,
    transcript: p.transcript,
    source: p.provider,
  };

  const { data: lead, error: leadError } = await admin.from("leads").insert(leadRow).select("id").single();

  if (leadError || !lead) {
    return { ok: false, status: 500, error: leadError?.message ?? "Failed to create lead" };
  }

  const callRow: CallsInsert = {
    company_id: p.company_id,
    lead_id: lead.id,
    provider: p.provider,
    provider_call_id: p.provider_call_id,
    caller_phone: p.caller_phone,
    call_status: p.call_status,
    recording_url: p.recording_url || null,
    transcript: p.transcript,
    summary: p.summary,
    urgency: p.urgency,
    started_at: started,
    ended_at: ended,
  };

  const { data: call, error: callError } = await admin.from("calls").insert(callRow).select("id").single();

  if (callError || !call) {
    return { ok: false, status: 500, error: callError?.message ?? "Failed to create call" };
  }

  return { ok: true, lead_id: lead.id, call_id: call.id, deduped: false };
}
