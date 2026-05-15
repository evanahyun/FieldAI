import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertLeadAndCallFromPayload } from "@/lib/calls/insertLeadAndCallFromPayload";
import { validateCallWebhookPayload } from "@/lib/calls/validateCallWebhookPayload";

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

  const validated = validateCallWebhookPayload(json);
  if (!validated.ok) {
    return NextResponse.json(
      {
        error: validated.error,
        fields: validated.fields,
        ...(validated.allowed ? { allowed: validated.allowed } : {}),
      },
      { status: validated.status },
    );
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server configuration error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const result = await insertLeadAndCallFromPayload(admin, validated.payload);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    success: true,
    lead_id: result.lead_id,
    call_id: result.call_id,
    deduped: result.deduped,
  });
}
