# FieldAI + Supabase database

Keep **Postgres**, **TypeScript** (`lib/types/database.ts`, `lib/supabase/database.types.ts`), and **this folder** in sync.

## New Supabase project (clean)

1. In **Supabase → SQL → New query**, paste and run the full file **`schema.sql`** (canonical tables, RLS, RPCs, triggers).

2. In **Authentication → URL configuration**, set **Site URL** and **Redirect URLs** for your app (see `docs/supabase-email-confirm.md`).

3. Optional: run **`migrations/0004_post_drift_fix.sql`** once (invite-token safety + `NOTIFY pgrst, 'reload schema'`).

## Existing project (already on older migrations)

Apply in order (skip any you already ran; each file uses `if not exists` where possible):

| File | Purpose |
|------|---------|
| `0001_fieldai_schema.sql` | Baseline tables + RLS (legacy `trade_type` / `emergency_rules`) |
| `0002_invite_token_join_seed.sql` | `invite_token`, join RPC, first demo seed |
| `0003_fieldai_saas_columns.sql` | `industry`, `ai_settings` new columns, calls metadata, RPC `p_industry`, new demo seed |
| `0004_post_drift_fix.sql` | Invite-token backfill if 0002 was skipped + **PostgREST schema reload** |
| `0005_intake_pipeline_fields.sql` | Service category, problem description, appointment request, and internal notes for call intake |

After **any** DDL change, if the app still errors on a column that **does** exist in the Table Editor, run **`0004_post_drift_fix.sql`** (or at least the final `notify pgrst, 'reload schema';` line) so the API layer picks up the new columns.

## Source of truth

- **`schema.sql`** — full picture of the latest public schema (matches app on `main`).
- **`migrations/`** — incremental history for upgrading older databases.

If you edit columns or RPCs, update **`schema.sql`** and add a new **`000N_*.sql`** migration, then align **`lib/types/database.ts`**.
