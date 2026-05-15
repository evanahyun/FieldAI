# Supabase email confirmation (FieldAI)

## What went wrong if you see `{"error":"requested path is invalid"}` on `*.supabase.co`

The confirmation link opened your **Supabase API project URL** (for example `https://xxxxx.supabase.co/?code=...`).

That host is **not** your app. It does not have a route that exchanges the `code` for a session, so Supabase returns **requested path is invalid**.

**Root cause:** In Supabase **Authentication → URL configuration**, the **Site URL** or a redirect was set to `https://<project-ref>.supabase.co` (or the email template sends users there). That value must be your **FieldAI** URL instead.

## Correct configuration

1. Deploy FieldAI and copy your real app URL, for example:
   - `https://your-app.vercel.app`
   - or local: `http://localhost:3000`

2. In **Supabase → Authentication → URL configuration**:
   - **Site URL:** your FieldAI URL (example: `https://your-app.vercel.app`).
   - **Redirect URLs:** add at least:
     - `https://your-app.vercel.app/**`
     - `https://your-app.vercel.app/auth/callback`
     - (optional for dev) `http://localhost:3000/**` and `http://localhost:3000/auth/callback`

3. Save, then trigger a **new** confirmation email (old links stay wrong).

## What FieldAI implements

After you deploy this repo, the route **`/auth/callback`** exchanges `?code=` for a session and sets auth cookies, then redirects (default **`/dashboard`**; middleware may send new users to **`/onboarding`**).

So your confirmation / magic-link redirects should land on:

`https://your-app.vercel.app/auth/callback`

(or the same path on `localhost` in development).

Optional query: `?next=/onboarding` is allowed (must be a same-site path starting with `/`).

## Quick checklist

| Wrong | Right |
|--------|--------|
| Site URL = `https://xxx.supabase.co` | Site URL = `https://your-fieldai.vercel.app` |
| Redirect only `supabase.co` | Redirect URLs include `https://your-fieldai.vercel.app/auth/callback` |
| Opening `supabase.co/?code=` in browser | Opening `your-fieldai.vercel.app/auth/callback?code=` |

## Still stuck?

- **Authentication → Email Templates → Confirm signup:** ensure links use Supabase’s default variables so `redirect_to` resolves to your Site URL / allowed redirect, not the raw API host.
- Request a **new** email after changing URLs; old messages keep old links.
