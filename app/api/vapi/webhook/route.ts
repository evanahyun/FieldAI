import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertLeadAndCallFromPayload } from "@/lib/calls/insertLeadAndCallFromPayload";
import { extractDispatchFromTranscript } from "@/lib/openai/extractDispatchFromTranscript";
import { parseVapiEndOfCallReport } from "@/lib/vapi/parseEndOfCallReport";
import { verifyVapiWebhookSecret } from "@/lib/vapi/verifyWebhookSecret";
import type { CallWebhookPayload } from "@/lib/types/database";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Vapi Server URL target. Configure assistant (or phone number) `server.url` to:
 * `{NEXT_PUBLIC_APP_URL}/api/vapi/webhook`
 * Enable server message: `end-of-call-report`.
 * Set call or assistant metadata `company_id` to your FieldAI company UUID.
 *
 * Auth: when `VAPI_WEBHOOK_SECRET` is set in production, requests must send the same value
 * as `Authorization: Bearer …` or `X-Vapi-Secret`.
 */
export async function POST(request: Request) {
  const expectedSecret = process.env.VAPI_WEBHOOK_SECRET?.trim();

  // Local / testing convenience only: skip webhook auth when `VAPI_WEBHOOK_SECRET` is unset or empty.
  // Production MUST set `VAPI_WEBHOOK_SECRET` so unauthenticated requests are rejected.
  if (expectedSecret && !verifyVapiWebhookSecret(request, expectedSecret)) {
    console.warn("[vapi-webhook] Unauthorized webhook request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Expected a JSON object" }, { status: 400 });
  }

  const message = isRecord(body.message) ? body.message : null;
  const msgType = message && typeof message.type === "string" ? message.type : "";
  const call = message && isRecord(message.call) ? message.call : null;
  const callId = call && typeof call.id === "string" ? call.id : "unknown";
  const status = message && typeof message.status === "string" ? message.status : undefined;

  console.info("[vapi-webhook] incoming event", {
    type: msgType || "no_message_type",
    callId,
    status,
    auth: expectedSecret ? "verified" : "skipped-local-testing",
  });

  if (msgType !== "end-of-call-report") {
    return NextResponse.json({ ok: true, ignored: msgType || "no_message_type" });
  }

  const parsed = parseVapiEndOfCallReport(body);
  if (!parsed.ok) {
    console.warn("[vapi-webhook] unable to parse end-of-call report", { callId, error: parsed.error });
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const extracted = await extractDispatchFromTranscript({
    transcript: parsed.data.transcript,
    summaryHint: parsed.data.summary_hint,
  });
  if (!extracted.ok) {
    console.error("[vapi-webhook] transcript extraction failed", { callId: parsed.data.provider_call_id, error: extracted.error });
    return NextResponse.json({ error: extracted.error }, { status: 502 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    const messageText = e instanceof Error ? e.message : "Server configuration error";
    return NextResponse.json({ error: messageText }, { status: 500 });
  }

  const payload: CallWebhookPayload = {
    company_id: parsed.data.company_id,
    provider: "vapi",
    provider_call_id: parsed.data.provider_call_id,
    caller_phone: parsed.data.caller_phone,
    customer_name: extracted.data.customer_name,
    service_address: extracted.data.service_address,
    issue_type: extracted.data.issue_type,
    service_category: extracted.data.service_category,
    problem_description: extracted.data.problem_description,
    urgency: extracted.data.urgency,
    preferred_time: extracted.data.preferred_time,
    appointment_request: extracted.data.appointment_request,
    internal_notes: extracted.data.internal_notes,
    summary: extracted.data.summary,
    transcript: parsed.data.transcript,
    recording_url: parsed.data.recording_url || "",
    call_status: parsed.data.call_status,
  };

  const result = await insertLeadAndCallFromPayload(admin, payload, {
    started_at: parsed.data.started_at,
    ended_at: parsed.data.ended_at,
  });

  if (!result.ok) {
    console.error("[vapi-webhook] failed to store call", { callId: parsed.data.provider_call_id, error: result.error });
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  console.info("[vapi-webhook] stored call intake", {
    callId: parsed.data.provider_call_id,
    leadId: result.lead_id,
    storedCallId: result.call_id,
    deduped: result.deduped,
    urgency: payload.urgency,
    status: payload.call_status,
  });

  return NextResponse.json({
    success: true,
    lead_id: result.lead_id,
    call_id: result.call_id,
    deduped: result.deduped,
  });
}
