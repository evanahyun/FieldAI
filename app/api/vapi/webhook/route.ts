import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertLeadAndCallFromPayload } from "@/lib/calls/insertLeadAndCallFromPayload";
import { extractDispatchFromTranscript } from "@/lib/openai/extractDispatchFromTranscript";
import { verifyVapiWebhookSecret } from "@/lib/vapi/verifyWebhookSecret";
import type { CallWebhookPayload } from "@/lib/types/database";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function eventFromBody(body: Record<string, unknown>): Record<string, unknown> {
  return isRecord(body.message) ? body.message : body;
}

function callFromEvent(event: Record<string, unknown>, body: Record<string, unknown>): Record<string, unknown> | null {
  if (isRecord(event.call)) return event.call;
  if (isRecord(body.call)) return body.call;
  return null;
}

function metadataCompanyId(call: Record<string, unknown> | null, event: Record<string, unknown>): string {
  const callMeta = call && isRecord(call.metadata) ? call.metadata : {};
  const assistant = isRecord(event.assistant) ? event.assistant : call && isRecord(call.assistant) ? call.assistant : {};
  const assistantMeta = isRecord(assistant.metadata) ? assistant.metadata : {};
  return (
    stringValue(callMeta.company_id) ||
    stringValue(callMeta.companyId) ||
    stringValue(assistantMeta.company_id) ||
    stringValue(assistantMeta.companyId) ||
    stringValue(event.company_id) ||
    stringValue(event.companyId)
  );
}

function callerPhone(call: Record<string, unknown> | null, event: Record<string, unknown>): string {
  const customer = call && isRecord(call.customer) ? call.customer : isRecord(event.customer) ? event.customer : {};
  return (
    stringValue(customer.number) ||
    stringValue(customer.phoneNumber) ||
    (call ? stringValue(call.phoneNumber) || stringValue(call.customerPhoneNumber) || stringValue(call.from) : "") ||
    stringValue(event.phoneNumber) ||
    stringValue(event.caller_phone) ||
    stringValue(event.callerPhone)
  );
}

function callId(call: Record<string, unknown> | null, event: Record<string, unknown>): string {
  return (
    (call ? stringValue(call.id) || stringValue(call.callId) : "") ||
    stringValue(event.callId) ||
    stringValue(event.call_id) ||
    stringValue(event.id) ||
    `vapi-${Date.now()}`
  );
}

function messagesTranscript(messages: unknown): string {
  if (!Array.isArray(messages)) return "";
  return messages
    .map((m) => {
      if (!isRecord(m)) return "";
      const role = stringValue(m.role) || "speaker";
      const text = stringValue(m.message) || stringValue(m.content) || stringValue(m.text);
      return text ? `${role}: ${text}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

function transcriptFromEvent(event: Record<string, unknown>): string {
  const artifact = isRecord(event.artifact) ? event.artifact : {};
  const analysis = isRecord(event.analysis) ? event.analysis : {};
  return (
    stringValue(event.transcript) ||
    stringValue(artifact.transcript) ||
    messagesTranscript(artifact.messages) ||
    messagesTranscript(event.messages) ||
    stringValue(analysis.transcript)
  );
}

function summaryFromEvent(event: Record<string, unknown>, call: Record<string, unknown> | null): string {
  const eventAnalysis = isRecord(event.analysis) ? event.analysis : {};
  const callAnalysis = call && isRecord(call.analysis) ? call.analysis : {};
  return (
    stringValue(event.summary) ||
    stringValue(eventAnalysis.summary) ||
    stringValue(callAnalysis.summary) ||
    stringValue(event.result)
  );
}

function recordingUrlFromEvent(event: Record<string, unknown>): string {
  const artifact = isRecord(event.artifact) ? event.artifact : {};
  const recording = isRecord(artifact.recording) ? artifact.recording : {};
  return (
    stringValue(artifact.recordingUrl) ||
    stringValue(recording.url) ||
    stringValue(recording.stereoUrl) ||
    stringValue(recording.combinedUrl)
  );
}

function statusFromEvent(event: Record<string, unknown>, call: Record<string, unknown> | null): string {
  return stringValue(event.status) || stringValue(event.endedReason) || (call ? stringValue(call.status) || stringValue(call.endedReason) : "");
}

function isTerminalVapiEvent(event: Record<string, unknown>, call: Record<string, unknown> | null): boolean {
  const type = stringValue(event.type);
  const status = statusFromEvent(event, call).toLowerCase();
  const analysis = isRecord(event.analysis) || Boolean(call && isRecord(call.analysis));
  return (
    type === "end-of-call-report" ||
    type === "call-ended" ||
    (type === "status-update" && ["ended", "completed", "complete"].includes(status)) ||
    Boolean(stringValue(event.endedReason)) ||
    analysis ||
    Boolean(summaryFromEvent(event, call)) ||
    Boolean(transcriptFromEvent(event))
  );
}

function rawPayloadNote(body: Record<string, unknown>, endedReason: string): string {
  return JSON.stringify(
    {
      endedReason: endedReason || null,
      rawPayload: body,
    },
    null,
    2,
  ).slice(0, 25_000);
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
  const isLocalTesting = process.env.NODE_ENV !== "production";
  const hasAuthHeader = Boolean(request.headers.get("authorization") || request.headers.get("x-vapi-secret"));

  // Local / testing convenience only: allow unauthenticated Vapi webhooks when
  // no auth header is provided. Production MUST set `VAPI_WEBHOOK_SECRET` and
  // requests must send the matching Bearer token or `X-Vapi-Secret`.
  const shouldVerifyAuth = Boolean(expectedSecret) && (!isLocalTesting || hasAuthHeader);
  if (shouldVerifyAuth && expectedSecret && !verifyVapiWebhookSecret(request, expectedSecret)) {
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

  console.info("VAPI WEBHOOK RECEIVED");
  console.info(JSON.stringify(body, null, 2));

  const event = eventFromBody(body);
  const msgType = stringValue(event.type) || "unknown";
  const call = callFromEvent(event, body);
  const providerCallId = callId(call, event);
  const status = statusFromEvent(event, call);

  console.info("[vapi-webhook] incoming event", {
    type: msgType,
    callId: providerCallId,
    status,
    auth: shouldVerifyAuth ? "verified" : "skipped-local-testing",
  });

  console.info(`[vapi-webhook] event type: ${msgType}`);

  if (!isTerminalVapiEvent(event, call)) {
    return NextResponse.json({ ok: true, ignored: msgType, terminal: false });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    const messageText = e instanceof Error ? e.message : "Server configuration error";
    return NextResponse.json({ error: messageText }, { status: 500 });
  }

  let company_id = metadataCompanyId(call, event);
  if (!company_id && isLocalTesting) {
    const { data: fallbackCompany, error: fallbackCompanyError } = await admin
      .from("companies")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (fallbackCompanyError || !fallbackCompany?.id) {
      console.error("[vapi-webhook] no company_id and no dev fallback company found", {
        error: fallbackCompanyError?.message,
        callId: providerCallId,
      });
      return NextResponse.json({ ok: true, saved: false, reason: "missing_company_id", call_id: providerCallId });
    }

    company_id = fallbackCompany.id;
    console.warn(`[vapi-webhook] missing company_id; using dev fallback company_id: ${company_id}`);
  }

  if (!company_id) {
    console.warn("[vapi-webhook] terminal event missing company_id; payload logged above", {
      type: msgType,
      callId: providerCallId,
    });
    return NextResponse.json({ ok: true, saved: false, reason: "missing_company_id", call_id: providerCallId });
  }

  const summaryHint = summaryFromEvent(event, call);
  const transcript = transcriptFromEvent(event) || summaryHint || `Call ended with status: ${status || msgType}.`;
  const endedReason = stringValue(event.endedReason) || (call ? stringValue(call.endedReason) : "") || status || msgType;

  let extracted: Awaited<ReturnType<typeof extractDispatchFromTranscript>>;
  try {
    extracted = await extractDispatchFromTranscript({
      transcript,
      summaryHint,
    });
  } catch (e) {
    extracted = {
      ok: false,
      error: e instanceof Error ? e.message : "OpenAI extraction threw an unknown error",
    };
  }

  const payload: CallWebhookPayload = extracted.ok
    ? {
        company_id,
        provider: "vapi",
        provider_call_id: providerCallId,
        caller_phone: callerPhone(call, event) || "Unknown caller",
        customer_name: extracted.data.customer_name,
        service_address: extracted.data.service_address,
        issue_type: extracted.data.issue_type,
        service_category: extracted.data.service_category,
        problem_description: extracted.data.problem_description,
        urgency: extracted.data.urgency,
        preferred_time: extracted.data.preferred_time,
        appointment_request: extracted.data.appointment_request,
        internal_notes: `${extracted.data.internal_notes}\n\nVapi status: ${status || "unknown"}\nEnded reason: ${endedReason || "unknown"}\n\nRaw payload:\n${rawPayloadNote(body, endedReason)}`,
        summary: extracted.data.summary,
        transcript,
        recording_url: recordingUrlFromEvent(event),
        call_status: status || endedReason || "completed",
      }
    : {
        company_id,
        provider: "vapi",
        provider_call_id: providerCallId,
        caller_phone: callerPhone(call, event) || "Unknown caller",
        customer_name: "Unknown caller",
        service_address: "Address not provided",
        issue_type: "Call completed",
        service_category: "plumbing",
        problem_description: transcript || summaryHint || "Call completed.",
        urgency: "unknown" as CallWebhookPayload["urgency"],
        preferred_time: "Not discussed",
        appointment_request: "Not discussed",
        internal_notes: JSON.stringify(body, null, 2),
        summary: "Call completed. See transcript/internal notes for details.",
        transcript,
        recording_url: recordingUrlFromEvent(event),
        call_status: status || endedReason || "completed",
      };

  if (extracted.ok) {
    console.info("[vapi-webhook] OpenAI extraction succeeded");
  } else {
    console.error("[vapi-webhook] OpenAI extraction failed; saving raw fallback lead", {
      callId: providerCallId,
      error: extracted.error,
    });
  }

  console.info("[vapi-webhook] attempting to store call intake");
  console.info("[vapi-webhook] normalized call intake", {
    company_id: payload.company_id,
    provider_call_id: payload.provider_call_id,
    customer_phone: payload.caller_phone,
    summary: payload.summary,
    service_category: payload.service_category,
    urgency: payload.urgency,
    status: payload.call_status,
  });

  const result = await insertLeadAndCallFromPayload(admin, payload, {
    started_at: call ? stringValue(call.startedAt) || stringValue(call.createdAt) || null : null,
    ended_at: call ? stringValue(call.endedAt) || stringValue(call.updatedAt) || new Date().toISOString() : new Date().toISOString(),
  });

  if (!result.ok) {
    console.error("[vapi-webhook] failed to store call", { callId: providerCallId, error: result.error });
    return NextResponse.json({ ok: true, saved: false, reason: "storage_failed", error: result.error, call_id: providerCallId });
  }

  console.info("[vapi-webhook] stored call intake", {
    callId: providerCallId,
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
