import type { Urgency } from "@/lib/types/database";

const URGENCY: Urgency[] = ["general inquiry", "scheduled", "same-day", "emergency"];

export type ExtractedDispatch = {
  customer_name: string;
  service_address: string;
  issue_type: string;
  service_category: string;
  problem_description: string;
  urgency: Urgency;
  preferred_time: string;
  appointment_request: string;
  internal_notes: string;
  summary: string;
};

function normalizeUrgency(value: unknown): Urgency {
  if (typeof value === "string" && URGENCY.includes(value as Urgency)) {
    return value as Urgency;
  }
  if (value === "low") return "general inquiry";
  if (value === "medium") return "scheduled";
  if (value === "high") return "same-day";
  return "scheduled";
}

function nonEmpty(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

function developmentFallbackExtraction(input: { transcript: string; summaryHint: string }): ExtractedDispatch {
  const text = input.summaryHint || input.transcript;
  return {
    customer_name: "Unknown caller",
    service_address: "Address not provided",
    issue_type: "General service request",
    service_category: "general service",
    problem_description: text.slice(0, 240) || "Caller requested service.",
    urgency: "scheduled",
    preferred_time: "Not discussed",
    appointment_request: "Needs follow-up",
    internal_notes: "Local test fallback used because OPENAI_API_KEY is not configured.",
    summary: text.slice(0, 500) || "Local test call captured.",
  };
}

/**
 * Uses OpenAI to map transcript (+ optional provider summary) into FieldAI webhook fields.
 */
export async function extractDispatchFromTranscript(input: {
  transcript: string;
  summaryHint: string;
}): Promise<{ ok: true; data: ExtractedDispatch } | { ok: false; error: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      // Local testing fallback only. Production should set OPENAI_API_KEY so
      // transcript extraction is reliable and consistent.
      return { ok: true, data: developmentFallbackExtraction(input) };
    }
    return { ok: false, error: "OPENAI_API_KEY is not configured" };
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const transcript = input.transcript.slice(0, 120_000);
  const hint = input.summaryHint.trim();

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You extract structured dispatch intake from a phone receptionist transcript.
Return a single JSON object with exactly these string keys:
customer_name, service_address, issue_type, service_category, problem_description, preferred_time, appointment_request, internal_notes, summary, urgency.
Rules:
- urgency must be exactly one of: general inquiry, scheduled, same-day, emergency.
- Use emergency for safety risks, active flooding, sewage backup, gas smell, electrical danger, unsafe no-heat/no-cooling conditions, or life-threatening context.
- Use same-day when the customer likely needs dispatch today but it is not life-threatening.
- Use scheduled for normal appointment requests.
- Use general inquiry for price/service questions or low-commitment calls.
- If the caller's name is unknown, use "Unknown caller".
- If service address is unknown, use "Address not provided".
- issue_type: short label (e.g. "No heat", "Leak under sink").
- service_category: one broad category such as plumbing, HVAC, electrical, roofing, landscaping, cleaning, contractor, med spa, wellness, auto repair, or general service.
- problem_description: one clear sentence about what is happening.
- preferred_time: what they asked for scheduling-wise, or "Not discussed" if absent.
- appointment_request: whether they requested a booking, callback, estimate, same-day service, or none.
- internal_notes: concise dispatch notes, including follow-up needs or missing information.
- summary: 2-4 sentences for a dispatcher.`,
        },
        {
          role: "user",
          content: `${hint ? `Assistant/provider summary (may be partial):\n${hint}\n\n` : ""}Transcript:\n${transcript}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `OpenAI error ${res.status}: ${text.slice(0, 500)}` };
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    return { ok: false, error: "OpenAI returned no content" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content) as unknown;
  } catch {
    return { ok: false, error: "OpenAI returned invalid JSON" };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: "OpenAI JSON was not an object" };
  }

  const o = parsed as Record<string, unknown>;
  const data: ExtractedDispatch = {
    customer_name: nonEmpty(o.customer_name, "Unknown caller"),
    service_address: nonEmpty(o.service_address, "Address not provided"),
    issue_type: nonEmpty(o.issue_type, "General inquiry"),
    service_category: nonEmpty(o.service_category, "general service"),
    problem_description: nonEmpty(o.problem_description, nonEmpty(o.issue_type, "Customer called for service.")),
    preferred_time: nonEmpty(o.preferred_time, "Not discussed"),
    appointment_request: nonEmpty(o.appointment_request, "Not discussed"),
    internal_notes: nonEmpty(o.internal_notes, "Review call summary and transcript before dispatch."),
    summary: nonEmpty(o.summary, transcript.slice(0, 500)),
    urgency: normalizeUrgency(o.urgency),
  };

  return { ok: true, data };
}
