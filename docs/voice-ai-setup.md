# Voice AI setup (Vapi-first)

FieldAI receives completed phone calls via an HTTPS webhook and stores **leads** plus **calls** in Supabase. The AI agent itself runs in your voice provider (recommended: **Vapi**); FieldAI is the CRM / dispatch backend.

## End-to-end flow

1. A customer calls your **Vapi** phone number.
2. Vapi runs your assistant using the **receptionist prompt** you configure (see below).
3. When the call ends, Vapi (or a small serverless function you own) **POSTs JSON** to FieldAI:
   - Production: `https://<your-vercel-domain>/api/calls/webhook`
   - Local: `http://localhost:3000/api/calls/webhook`
4. FieldAI validates the payload, inserts a **lead** and a **call**, and links `call.lead_id` → `lead.id`.
5. Your team sees the lead under **Dashboard → Leads**.

## Where to paste the generated prompt

1. Sign in to FieldAI and open **Dashboard → AI agent**.
2. Fill in assistant name, greeting, tone, hours, services, intake questions, urgency rules, transfer phone, and booking instructions.
3. Scroll to **Generated receptionist prompt** and copy the full text.
4. In **Vapi**, open your assistant → system prompt / instructions → paste the copied prompt.
5. Save and publish the assistant.

The prompt is intentionally **industry-agnostic** so the same template works for plumbers, HVAC, med spas, auto shops, etc.

## Webhook URL

In Vapi (or your proxy), configure an HTTP request to:

`POST /api/calls/webhook`

Use your deployed base URL on Vercel, for example:

`https://fieldai.example.com/api/calls/webhook`

## Optional webhook authentication

Set `CALLS_WEBHOOK_SECRET` in Vercel (and locally in `.env.local`). When set, requests must include either:

- Header `Authorization: Bearer <CALLS_WEBHOOK_SECRET>`, or
- Header `X-Webhook-Secret: <CALLS_WEBHOOK_SECRET>`

## JSON body FieldAI expects

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

## How to test without Vapi

1. Run FieldAI locally (`npm run dev`).
2. Sign up / complete **Onboarding** so you have a `company_id`.
3. Open **`/dev/test-call`**, edit the JSON if you like, and click **Send test webhook**.
4. Confirm a **200** response with `lead_id`.
5. Open **Dashboard → Leads** and click the new lead.

In development you can also click **Load demo data** on the dashboard to insert multi-vertical sample rows.

## Verifying production

1. Deploy to Vercel with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and **`SUPABASE_SERVICE_ROLE_KEY`** (server only — never expose to the browser).
2. Optionally set `CALLS_WEBHOOK_SECRET`.
3. Place a test call through Vapi that ends in a webhook POST.
4. Refresh **Dashboard** and **Leads** — the new lead should appear with correct urgency and summary.

## Not fully integrated yet

Native Vapi “one-click” install is **not** wired in-repo yet. Today you copy the prompt manually and point Vapi’s HTTP action / serverless bridge at FieldAI’s webhook. That keeps FieldAI provider-agnostic (Retell, Telnyx voice apps, etc. can use the same JSON contract).
