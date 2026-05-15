function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readMetadataCompanyId(call: Record<string, unknown>, assistant: Record<string, unknown> | null): string | null {
  const callMeta = isRecord(call.metadata) ? call.metadata : {};
  const asstMeta = assistant && isRecord(assistant.metadata) ? assistant.metadata : {};
  const raw =
    callMeta.company_id ??
    callMeta.companyId ??
    asstMeta.company_id ??
    asstMeta.companyId ??
    null;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

function pickCallerPhone(call: Record<string, unknown>): string | null {
  const customer = isRecord(call.customer) ? call.customer : null;
  const fromCustomer = customer && typeof customer.number === "string" ? customer.number.trim() : "";
  if (fromCustomer) return fromCustomer;
  if (typeof call.phoneNumber === "string" && call.phoneNumber.trim()) return call.phoneNumber.trim();
  if (typeof call.customerPhoneNumber === "string" && call.customerPhoneNumber.trim()) {
    return call.customerPhoneNumber.trim();
  }
  return null;
}

function pickTranscript(message: Record<string, unknown>): string {
  const direct = typeof message.transcript === "string" ? message.transcript.trim() : "";
  if (direct) return direct;

  const artifact = isRecord(message.artifact) ? message.artifact : null;
  if (artifact) {
    const artText = typeof artifact.transcript === "string" ? artifact.transcript.trim() : "";
    if (artText) return artText;
    const messages = artifact.messages;
    if (Array.isArray(messages)) {
      const lines = messages
        .map((m) => {
          if (!isRecord(m)) return null;
          const role = typeof m.role === "string" ? m.role : "unknown";
          const text =
            (typeof m.message === "string" && m.message) ||
            (typeof m.content === "string" && m.content) ||
            (typeof m.text === "string" && m.text) ||
            "";
          return text ? `${role}: ${text}` : null;
        })
        .filter((x): x is string => Boolean(x));
      if (lines.length) return lines.join("\n");
    }
  }
  return "";
}

function pickRecordingUrl(message: Record<string, unknown>): string {
  const artifact = isRecord(message.artifact) ? message.artifact : null;
  if (!artifact) return "";

  if (typeof artifact.recordingUrl === "string" && artifact.recordingUrl.trim()) {
    return artifact.recordingUrl.trim();
  }

  const rec = isRecord(artifact.recording) ? artifact.recording : null;
  if (rec) {
    for (const key of ["stereoUrl", "mono", "combinedUrl", "url"]) {
      const v = rec[key];
      if (typeof v === "string" && v.trim()) return v.trim();
      if (isRecord(v)) {
        for (const inner of ["combinedUrl", "url", "recordingUrl"]) {
          const u = v[inner];
          if (typeof u === "string" && u.trim()) return u.trim();
        }
      }
    }
  }
  return "";
}

function pickSummaryHint(message: Record<string, unknown>): string {
  const direct = typeof message.summary === "string" ? message.summary.trim() : "";
  if (direct) return direct;
  const analysis = isRecord(message.analysis) ? message.analysis : null;
  if (analysis && typeof analysis.summary === "string") return analysis.summary.trim();
  return "";
}

export type ParsedVapiEndOfCall = {
  company_id: string;
  provider_call_id: string;
  caller_phone: string;
  transcript: string;
  recording_url: string;
  summary_hint: string;
  started_at: string | null;
  ended_at: string | null;
};

/**
 * Parses Vapi `end-of-call-report` server message body (`{ message: { type, call, artifact, ... } }`).
 */
export function parseVapiEndOfCallReport(body: unknown): { ok: true; data: ParsedVapiEndOfCall } | { ok: false; error: string } {
  if (!isRecord(body)) {
    return { ok: false, error: "Expected JSON object" };
  }
  const msg = isRecord(body.message) ? body.message : null;
  if (!msg) {
    return { ok: false, error: "Missing message" };
  }
  if (msg.type !== "end-of-call-report") {
    return { ok: false, error: `Unsupported message type: ${String(msg.type)}` };
  }

  const call = isRecord(msg.call) ? msg.call : null;
  if (!call) {
    return { ok: false, error: "Missing call on end-of-call-report" };
  }

  const assistant = isRecord(msg.assistant) ? msg.assistant : isRecord(call.assistant) ? (call.assistant as Record<string, unknown>) : null;

  const company_id = readMetadataCompanyId(call, assistant);
  if (!company_id) {
    return {
      ok: false,
      error:
        "Missing company id: set assistant or call metadata `company_id` to your FieldAI company UUID (Dashboard → Settings).",
    };
  }

  const idRaw = call.id;
  const provider_call_id = typeof idRaw === "string" ? idRaw : idRaw != null ? String(idRaw) : "";
  if (!provider_call_id) {
    return { ok: false, error: "Missing call.id" };
  }

  const caller_phone = pickCallerPhone(call);
  if (!caller_phone) {
    return { ok: false, error: "Could not determine caller phone from Vapi call payload" };
  }

  const transcript = pickTranscript(msg);
  const summary_hint = pickSummaryHint(msg);
  if (!transcript && !summary_hint) {
    return { ok: false, error: "No transcript or summary on end-of-call-report" };
  }

  const startedRaw = call.startedAt ?? call.createdAt;
  const endedRaw = call.endedAt ?? call.updatedAt;
  const started_at = typeof startedRaw === "string" && startedRaw ? startedRaw : null;
  const ended_at = typeof endedRaw === "string" && endedRaw ? endedRaw : null;

  return {
    ok: true,
    data: {
      company_id,
      provider_call_id,
      caller_phone,
      transcript: transcript || summary_hint,
      recording_url: pickRecordingUrl(msg),
      summary_hint,
      started_at,
      ended_at,
    },
  };
}
