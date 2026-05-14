import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Urgency } from "@/lib/types/database";

const URGENCY_LEVELS: Urgency[] = ["low", "medium", "high", "emergency"];

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

  const companyId = json.company_id;
  const callerPhone = json.caller_phone;
  const customerName = json.customer_name;
  const serviceAddress = json.service_address;
  const issueType = json.issue_type;
  const urgency = json.urgency;
  const preferredTime = json.preferred_time;
  const summary = json.summary;
  const transcript = json.transcript;
  const callStatus = json.call_status;

  const missing: string[] = [];
  if (typeof companyId !== "string" || !companyId) missing.push("company_id");
  if (typeof callerPhone !== "string" || !callerPhone) missing.push("caller_phone");
  if (typeof customerName !== "string" || !customerName) missing.push("customer_name");
  if (typeof serviceAddress !== "string" || !serviceAddress) missing.push("service_address");
  if (typeof issueType !== "string" || !issueType) missing.push("issue_type");
  if (typeof urgency !== "string" || !urgency) missing.push("urgency");
  if (typeof preferredTime !== "string" || !preferredTime) missing.push("preferred_time");
  if (typeof summary !== "string" || !summary) missing.push("summary");
  if (typeof transcript !== "string" || !transcript) missing.push("transcript");
  if (typeof callStatus !== "string" || !callStatus) missing.push("call_status");

  if (missing.length) {
    return NextResponse.json({ error: "Missing required fields", fields: missing }, { status: 400 });
  }

  const body = {
    companyId: companyId as string,
    callerPhone: callerPhone as string,
    customerName: customerName as string,
    serviceAddress: serviceAddress as string,
    issueType: issueType as string,
    urgency: urgency as Urgency,
    preferredTime: preferredTime as string,
    summary: summary as string,
    transcript: transcript as string,
    callStatus: callStatus as string,
  };

  if (!URGENCY_LEVELS.includes(body.urgency)) {
    return NextResponse.json({ error: "Invalid urgency", allowed: URGENCY_LEVELS }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server configuration error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { data: company, error: companyError } = await admin.from("companies").select("id").eq("id", body.companyId).maybeSingle();

  if (companyError) {
    return NextResponse.json({ error: companyError.message }, { status: 500 });
  }

  if (!company) {
    return NextResponse.json({ error: "Unknown company_id" }, { status: 404 });
  }

  const nowIso = new Date().toISOString();

  const { data: lead, error: leadError } = await admin
    .from("leads")
    .insert({
      company_id: body.companyId,
      customer_name: body.customerName,
      customer_phone: body.callerPhone,
      service_address: body.serviceAddress,
      issue_type: body.issueType,
      urgency: body.urgency,
      status: "New",
      preferred_time: body.preferredTime,
      summary: body.summary,
      transcript: body.transcript,
    })
    .select("id")
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: leadError?.message ?? "Failed to create lead" }, { status: 500 });
  }

  const { data: call, error: callError } = await admin
    .from("calls")
    .insert({
      company_id: body.companyId,
      lead_id: lead.id,
      caller_phone: body.callerPhone,
      call_status: body.callStatus,
      transcript: body.transcript,
      summary: body.summary,
      urgency: body.urgency,
      started_at: nowIso,
      ended_at: nowIso,
    })
    .select("id")
    .single();

  if (callError || !call) {
    return NextResponse.json({ error: callError?.message ?? "Failed to create call" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    lead_id: lead.id,
    call_id: call.id,
  });
}
