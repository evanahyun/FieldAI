# Voice AI setup (Vapi-first)

FieldAI stores **leads** and **calls** in Supabase when a call completes. The AI phone stack runs in **Vapi** (or any provider that can POST JSON); FieldAI is the CRM / dispatch backend.

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
2. Fill in the business-focused sections; FieldAI builds the technical receptionist instructions automatically from what you save.

### Raw prompt text (developers only)

The compiled prompt is produced by `lib/ai/generateReceptionistPrompt.ts`. To inspect it, run the app locally with `npm run dev` (`NODE_ENV=development`), open the same page, and enable **Show generated prompt** at the bottom. That control is omitted from production builds.

If you maintain a separate voice stack (for example Vapi), paste the generated text into the provider’s system / instructions field when you need parity with FieldAI’s saved rules.

The prompt template stays **industry-agnostic** so one structure works for plumbers, HVAC, med spas, auto shops, and similar businesses.

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
