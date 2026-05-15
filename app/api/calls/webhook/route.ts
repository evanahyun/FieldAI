import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import type { CallWebhookPayload, Urgency } from "@/lib/types/database";

const URGENCY_LEVELS: Urgency[] = ["low", "medium", "high", "emergency"];

type LeadsInsert = Database["public"]["Tables"]["leads"]["Insert"];
type CallsInsert = Database["public"]["Tables"]["calls"]["Insert"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  const expectedSecret = process.env.CALLS_WEBHOOK_SECRET;
  if (expectedSecret) {
    const authHeader = request.headers.get("authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
    const headerSecret = request.headers.get("x-webhook-secret");
    if (bearer !== expectedSecret && headerSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isRecord(json)) {
    return NextResponse.json({ error: "Expected a JSON object" }, { status: 400 });
  }

  const company_id = json.company_id;
  const provider = json.provider;
  const provider_call_id = json.provider_call_id;
  const caller_phone = json.caller_phone;
  const customer_name = json.customer_name;
  const service_address = json.service_address;
  const issue_type = json.issue_type;
  const urgency = json.urgency;
  const preferred_time = json.preferred_time;
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
    return NextResponse.json({ error: "Missing required fields", fields: missing }, { status: 400 });
  }

  const p = json as unknown as CallWebhookPayload;

  if (!URGENCY_LEVELS.includes(p.urgency)) {
    return NextResponse.json({ error: "Invalid urgency", allowed: URGENCY_LEVELS }, { status: 400 });
  }

  let admin: SupabaseClient<Database>;
  try {
    admin = createAdminClient();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server configuration error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { data: company, error: companyError } = await admin.from("companies").select("id").eq("id", p.company_id).maybeSingle();

  if (companyError) {
    return NextResponse.json({ error: companyError.message }, { status: 500 });
  }

  if (!company) {
    return NextResponse.json({ error: "Unknown company_id" }, { status: 404 });
  }

  const nowIso = new Date().toISOString();

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
    return NextResponse.json({ error: leadError?.message ?? "Failed to create lead" }, { status: 500 });
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
    started_at: nowIso,
    ended_at: nowIso,
  };

  const { data: call, error: callError } = await admin.from("calls").insert(callRow).select("id").single();

  if (callError || !call) {
    return NextResponse.json({ error: callError?.message ?? "Failed to create call" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    lead_id: lead.id,
    call_id: call.id,
  });
}
