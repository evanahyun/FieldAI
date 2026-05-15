import type { Urgency } from "@/lib/types/database";

const URGENCY: Urgency[] = ["low", "medium", "high", "emergency"];

export type ExtractedDispatch = {
  customer_name: string;
  service_address: string;
  issue_type: string;
  urgency: Urgency;
  preferred_time: string;
  summary: string;
};

function normalizeUrgency(value: unknown): Urgency {
  if (typeof value === "string" && URGENCY.includes(value as Urgency)) {
    return value as Urgency;
  }
  return "medium";
}

function nonEmpty(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
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
customer_name, service_address, issue_type, preferred_time, summary, urgency.
Rules:
- urgency must be exactly one of: low, medium, high, emergency (use emergency for safety risks, active flooding, gas smell, medical emergency in service context).
- If the caller's name is unknown, use "Unknown caller".
- If service address is unknown, use "Address not provided".
- issue_type: short label (e.g. "No heat", "Leak under sink").
- preferred_time: what they asked for scheduling-wise, or "Not discussed" if absent.
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
    preferred_time: nonEmpty(o.preferred_time, "Not discussed"),
    summary: nonEmpty(o.summary, transcript.slice(0, 500)),
    urgency: normalizeUrgency(o.urgency),
  };

  return { ok: true, data };
}
