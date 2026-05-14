export type Urgency = "low" | "medium" | "high" | "emergency";

export type LeadStatus = "New" | "Contacted" | "Booked" | "Closed" | "Lost";

export interface Company {
  id: string;
  name: string;
  trade_type: string | null;
  phone: string | null;
  owner_user_id: string;
  invite_token?: string | null;
  created_at: string;
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
  created_at: string;
}

/** Row shape for `insert into leads` (explicit so Supabase generics do not collapse to `never`). */
export type LeadInsert = {
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
  created_at?: string;
};

export interface Call {
  id: string;
  company_id: string;
  lead_id: string | null;
  caller_phone: string | null;
  call_status: string | null;
  transcript: string | null;
  summary: string | null;
  urgency: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export type CallInsert = {
  id?: string;
  company_id: string;
  lead_id?: string | null;
  caller_phone?: string | null;
  call_status?: string | null;
  transcript?: string | null;
  summary?: string | null;
  urgency?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  created_at?: string;
};

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
  business_hours: string | null;
  emergency_rules: string | null;
  services_offered: string | null;
  greeting: string | null;
  fallback_instructions: string | null;
  created_at: string;
  updated_at: string;
}

export interface CallWebhookPayload {
  company_id: string;
  caller_phone: string;
  customer_name: string;
  service_address: string;
  issue_type: string;
  urgency: Urgency;
  preferred_time: string;
  summary: string;
  transcript: string;
  call_status: string;
}
