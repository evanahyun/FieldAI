export type Urgency = "low" | "medium" | "high" | "emergency";

export type LeadStatus = "New" | "Contacted" | "Qualified" | "Booked" | "Completed" | "Lost";

export interface Company {
  id: string;
  name: string;
  industry: string | null;
  phone: string | null;
  owner_user_id: string;
  invite_token?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyUser {
  id: string;
  company_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export interface Lead {
  id: string;
  company_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  service_address: string | null;
  issue_type: string | null;
  urgency: string | null;
  status: string;
  preferred_time: string | null;
  summary: string | null;
  transcript: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadInsert {
  id?: string;
  company_id: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  service_address?: string | null;
  issue_type?: string | null;
  urgency?: string | null;
  status?: string;
  preferred_time?: string | null;
  summary?: string | null;
  transcript?: string | null;
  source?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Call {
  id: string;
  company_id: string;
  lead_id: string | null;
  provider: string | null;
  provider_call_id: string | null;
  caller_phone: string | null;
  call_status: string | null;
  recording_url: string | null;
  transcript: string | null;
  summary: string | null;
  urgency: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface CallInsert {
  id?: string;
  company_id: string;
  lead_id?: string | null;
  provider?: string | null;
  provider_call_id?: string | null;
  caller_phone?: string | null;
  call_status?: string | null;
  recording_url?: string | null;
  transcript?: string | null;
  summary?: string | null;
  urgency?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  created_at?: string;
}

export interface Appointment {
  id: string;
  company_id: string;
  lead_id: string | null;
  appointment_time: string;
  notes: string | null;
  status: string;
  created_at: string;
}

export interface AiSettings {
  id: string;
  company_id: string;
  assistant_name: string | null;
  greeting: string | null;
  tone: string | null;
  business_hours: string | null;
  services_offered: string | null;
  intake_questions: string | null;
  urgency_rules: string | null;
  fallback_instructions: string | null;
  transfer_phone: string | null;
  booking_instructions: string | null;
  created_at: string;
  updated_at: string;
}

/** Payload for POST /api/calls/webhook (snake_case). */
export interface CallWebhookPayload {
  company_id: string;
  provider: string;
  provider_call_id: string;
  caller_phone: string;
  customer_name: string;
  service_address: string;
  issue_type: string;
  urgency: Urgency;
  preferred_time: string;
  summary: string;
  transcript: string;
  recording_url: string;
  call_status: string;
}
