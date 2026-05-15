# Voice AI setup (Vapi-first)

FieldAI stores **leads** and **calls** in Supabase when a call completes. The AI phone stack runs in **Vapi** (or any provider that can POST JSON); FieldAI is the CRM / dispatch backend.

## Behavioral prompt vs. operator setup

The system instructions FieldAI builds from **Dashboard → Receptionist** (`lib/ai/generateReceptionistPrompt.ts`) are **behavioral only**: identity, tone, intake, triage, scheduling language, angry callers, and how to close a call. They are written so the assistant behaves like a trained **front desk / dispatcher / intake** professional—not like a developer tool.

They **intentionally do not** include JSON examples, webhook steps, `company_id`, “POST this…”, Vapi dashboard walkthroughs, or any backend jargon. Those topics stay **here** and in **Dashboard → Settings** (company ID, webhook URL, secrets).

**After each call**, FieldAI’s **server** receives the provider payload (for example Vapi’s `end-of-call-report`), runs **transcript-backed extraction** (OpenAI on the server), and creates or dedupes **leads** and **calls**. The live assistant prompt only controls **how the AI sounds and behaves on the phone**; it does not describe how data is saved.

**For customers:** configure **business rules** under **Dashboard → Receptionist**—not raw system prompts. FieldAI turns those saved rules into the behavioral prompt automatically. **Operators** handle webhooks, credentials, and phone-system wiring using this doc and **Dashboard → Settings**, not by pasting integration instructions into the assistant prompt.

## Recommended: native Vapi webhook

FieldAI exposes **`POST /api/vapi/webhook`** for Vapi’s **Server URL**. On each **`end-of-call-report`**, FieldAI:

1. Verifies **`VAPI_WEBHOOK_SECRET`** (`Authorization: Bearer …` or **`X-Vapi-Secret`**, matching your Vapi Custom Credential).
2. Reads **`company_id`** from Vapi **assistant or call metadata** (must match **Dashboard → Settings → Company ID**).
3. Pulls transcript / recording hints from the Vapi payload.
4. Calls **OpenAI** (`OPENAI_API_KEY`, optional `OPENAI_MODEL`, default `gpt-4o-mini`) to extract name, address, issue, urgency, preferred time, and summary.
5. Inserts a **lead** and **call** (same as the generic webhook). Re-sends for the same Vapi `call.id` are **deduped**.

### Vercel environment variables

See **`.env.example`**. Minimum for this path:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Public app URL (no trailing slash); used in Settings to show the full Vapi Server URL to paste. |
| `OPENAI_API_KEY` | Server-side extraction from transcript. |
| `VAPI_WEBHOOK_SECRET` | Must match the token Vapi sends (Bearer or `X-Vapi-Secret`). |
| `SUPABASE_SERVICE_ROLE_KEY` | Required for inserts (server only). |

Also set the Supabase client vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### Vapi dashboard checklist

1. **Assistant → Metadata** (or phone number metadata): add **`company_id`** = your FieldAI company UUID (from **Dashboard → Settings**).
2. **Server URL**: `https://<your-domain>/api/vapi/webhook` (copy from Settings when `NEXT_PUBLIC_APP_URL` is set).
3. **Server messages**: include **`end-of-call-report`**.
4. **Custom Credential**: Bearer token (or legacy `X-Vapi-Secret`) = same value as `VAPI_WEBHOOK_SECRET` in Vercel.

## Alternative: generic JSON webhook

If your stack already produces the full payload (no OpenAI in FieldAI), **`POST /api/calls/webhook`** accepts the same shape FieldAI has always used.

Use your deployed base URL, for example:

`https://your-app.vercel.app/api/calls/webhook`

### Optional authentication

Set **`CALLS_WEBHOOK_SECRET`** in Vercel. When set, requests must include either:

- Header `Authorization: Bearer <CALLS_WEBHOOK_SECRET>`, or  
- Header `X-Webhook-Secret: <CALLS_WEBHOOK_SECRET>`

### JSON body (`/api/calls/webhook`)

All fields are **required** (use an empty string for `recording_url` if none):

```json
{
  "company_id": "<uuid from Dashboard → Settings>",
  "provider": "vapi",
  "provider_call_id": "<id from provider>",
  "caller_phone": "+15551234567",
  "customer_name": "Jane Doe",
  "service_address": "123 Main St, City, ST",
  "issue_type": "No heat",
  "urgency": "high",
  "preferred_time": "Tomorrow morning",
  "summary": "2–4 sentence summary for dispatch.",
  "transcript": "Full call transcript text.",
  "recording_url": "",
  "call_status": "completed"
}
```

`urgency` must be one of: `low`, `medium`, `high`, `emergency`.

`lead.source` is set to the `provider` string (e.g. `vapi`).

## Receptionist rules in FieldAI

1. Sign in and open **Dashboard → Receptionist** (route `/dashboard/ai-agent`).
2. Fill in the business-focused sections. FieldAI turns them into a **call-behavior** system prompt automatically—focused on how the assistant represents your business on the phone, not on integrations.

### Raw prompt text (developers only)

The compiled prompt is produced by `lib/ai/generateReceptionistPrompt.ts`. To inspect it, run the app locally with `npm run dev` (`NODE_ENV=development`), open the same page, and enable **Show generated prompt** at the bottom. That control is omitted from production builds.

If you use a separate voice stack (for example Vapi), paste that **behavioral** text into the provider’s system / instructions field. Keep **webhook URLs, secrets, and `company_id` metadata** configured in Vapi and in FieldAI Settings—do not paste integration docs into the assistant prompt.

The prompt stays **industry-agnostic** so one structure works for plumbers, HVAC, electrical, roofing, landscaping, cleaning, contractors, med spas, wellness, auto shops, and similar local services.

## How to test without a live phone

1. Run FieldAI locally (`npm run dev`).
2. Complete **Onboarding** so you have a `company_id`.
3. Open **`/dev/test-call`** and POST to **`/api/calls/webhook`** with the JSON above.
4. Or use **Load demo data** on the dashboard for sample rows.

## Verifying production

1. Deploy with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, **`SUPABASE_SERVICE_ROLE_KEY`**, **`OPENAI_API_KEY`**, **`VAPI_WEBHOOK_SECRET`**, and **`NEXT_PUBLIC_APP_URL`**.
2. Place a test call through Vapi; when the call ends, Vapi should POST **`end-of-call-report`**.
3. Refresh **Dashboard** and **Leads** — the new lead should appear.

If the Table Editor shows columns but the API errors after migrations, run **`supabase/migrations/0004_post_drift_fix.sql`** (includes PostgREST schema reload).
