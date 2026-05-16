import type { CallWebhookPayload, Urgency } from "@/lib/types/database";

const URGENCY_LEVELS: Urgency[] = ["general inquiry", "scheduled", "same-day", "emergency"];
const LEGACY_URGENCY_MAP: Record<string, Urgency> = {
  low: "general inquiry",
  medium: "scheduled",
  high: "same-day",
};

export type ValidatePayloadResult =
  | { ok: true; payload: CallWebhookPayload }
  | { ok: false; status: number; error: string; fields?: string[]; allowed?: Urgency[] };

export function validateCallWebhookPayload(json: Record<string, unknown>): ValidatePayloadResult {
  const company_id = json.company_id;
  const provider = json.provider;
  const provider_call_id = json.provider_call_id;
  const caller_phone = json.caller_phone;
  const customer_name = json.customer_name;
  const service_address = json.service_address;
  const issue_type = json.issue_type;
  const service_category = json.service_category;
  const problem_description = json.problem_description;
  const urgency = json.urgency;
  const preferred_time = json.preferred_time;
  const appointment_request = json.appointment_request;
  const internal_notes = json.internal_notes;
  const summary = json.summary;
  const transcript = json.transcript;
  const recording_url = json.recording_url;
  const call_status = json.call_status;

  const missing: string[] = [];
  if (typeof company_id !== "string" || !company_id) missing.push("company_id");
  if (typeof provider !== "string" || !provider) missing.push("provider");
  if (typeof provider_call_id !== "string" || !provider_call_id) missing.push("provider_call_id");
  if (typeof caller_phone !== "string" || !caller_phone) missing.push("caller_phone");
  if (typeof customer_name !== "string" || !customer_name) missing.push("customer_name");
  if (typeof service_address !== "string" || !service_address) missing.push("service_address");
  if (typeof issue_type !== "string" || !issue_type) missing.push("issue_type");
  if (typeof urgency !== "string" || !urgency) missing.push("urgency");
  if (typeof preferred_time !== "string" || !preferred_time) missing.push("preferred_time");
  if (typeof summary !== "string" || !summary) missing.push("summary");
  if (typeof transcript !== "string" || !transcript) missing.push("transcript");
  if (typeof recording_url !== "string") missing.push("recording_url");
  if (typeof call_status !== "string" || !call_status) missing.push("call_status");

  if (missing.length) {
    return { ok: false, status: 400, error: "Missing required fields", fields: missing };
  }

  const normalizedUrgency =
    typeof urgency === "string" && urgency in LEGACY_URGENCY_MAP ? LEGACY_URGENCY_MAP[urgency] : urgency;

  const p = {
    ...json,
    urgency: normalizedUrgency,
    service_category: typeof service_category === "string" ? service_category : issue_type,
    problem_description: typeof problem_description === "string" ? problem_description : summary,
    appointment_request: typeof appointment_request === "string" ? appointment_request : preferred_time,
    internal_notes: typeof internal_notes === "string" ? internal_notes : "",
  } as unknown as CallWebhookPayload;

  if (!URGENCY_LEVELS.includes(p.urgency)) {
    return { ok: false, status: 400, error: "Invalid urgency", fields: ["urgency"], allowed: URGENCY_LEVELS };
  }

  return { ok: true, payload: p };
}
