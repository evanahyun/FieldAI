import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CallWebhookPayload } from "@/lib/types/database";

type LeadsInsert = Database["public"]["Tables"]["leads"]["Insert"];
type CallsInsert = Database["public"]["Tables"]["calls"]["Insert"];
type AppointmentsInsert = Database["public"]["Tables"]["appointments"]["Insert"];

export type InsertLeadAndCallResult =
  | { ok: true; lead_id: string; call_id: string; deduped: boolean }
  | { ok: false; status: number; error: string };

export type InsertLeadAndCallOptions = {
  started_at?: string | null;
  ended_at?: string | null;
};

function deriveLeadStatus(p: CallWebhookPayload): string {
  const status = p.call_status.toLowerCase();
  const appointment = (p.appointment_request ?? p.preferred_time).toLowerCase();

  if (["missed", "no-answer", "no_answer", "abandoned"].some((s) => status.includes(s))) return "missed";
  if (["booked", "scheduled", "confirmed"].some((s) => appointment.includes(s))) return "booked";
  if (p.preferred_time && p.preferred_time.toLowerCase() !== "not discussed") return "awaiting confirmation";
  if (p.urgency === "emergency" || p.urgency === "same-day") return "needs follow-up";
  return "new";
}

function getMockAppointmentTime(preferredTime: string): string {
  const parsed = Date.parse(preferredTime);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();

  // MVP calendar placeholder: until a real calendar is connected, hold the next
  // weekday at 9 AM so the office has a visible appointment request to confirm.
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString();
}

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
  const leadStatus = deriveLeadStatus(p);

  const leadRow: LeadsInsert = {
    company_id: p.company_id,
    customer_name: p.customer_name,
    customer_phone: p.caller_phone,
    service_address: p.service_address,
    issue_type: p.issue_type,
    service_category: p.service_category ?? p.issue_type,
    problem_description: p.problem_description ?? p.summary,
    urgency: p.urgency,
    status: leadStatus,
    preferred_time: p.preferred_time,
    appointment_request: p.appointment_request ?? p.preferred_time,
    internal_notes: p.internal_notes ?? "",
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
    service_category: p.service_category ?? p.issue_type,
    appointment_request: p.appointment_request ?? p.preferred_time,
    internal_notes: p.internal_notes ?? "",
    started_at: started,
    ended_at: ended,
  };

  const { data: call, error: callError } = await admin.from("calls").insert(callRow).select("id").single();

  if (callError || !call) {
    return { ok: false, status: 500, error: callError?.message ?? "Failed to create call" };
  }

  if (leadStatus === "booked" || leadStatus === "awaiting confirmation") {
    const appointmentRow: AppointmentsInsert = {
      company_id: p.company_id,
      lead_id: lead.id,
      appointment_time: getMockAppointmentTime(p.preferred_time),
      notes: p.appointment_request ?? p.summary,
      status: leadStatus === "booked" ? "booked" : "awaiting confirmation",
    };
    const { error: appointmentError } = await admin.from("appointments").insert(appointmentRow);
    if (appointmentError) {
      return { ok: false, status: 500, error: appointmentError.message };
    }
  }

  return { ok: true, lead_id: lead.id, call_id: call.id, deduped: false };
}
