-- FieldAI 0004: close common gaps after partial / out-of-order migrations.
-- Safe to run multiple times in Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- Invite codes (0002) — some projects jumped straight to 0003 and skipped 0002
-- ---------------------------------------------------------------------------

alter table public.companies add column if not exists invite_token text;

update public.companies
set invite_token = encode(gen_random_bytes(9), 'hex')
where invite_token is null;

alter table public.companies
  alter column invite_token set default encode(gen_random_bytes(9), 'hex');

alter table public.companies
  alter column invite_token set not null;

create unique index if not exists companies_invite_token_key on public.companies (invite_token);

-- ---------------------------------------------------------------------------
-- RPC grants (idempotent)
-- ---------------------------------------------------------------------------

grant execute on function public.create_company_with_owner(text, text, text) to authenticated;
grant execute on function public.join_company_by_invite(text) to authenticated;
grant execute on function public.seed_demo_for_my_company(boolean) to authenticated;
grant execute on function public.is_company_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- PostgREST: reload API schema cache (fixes stale "column does not exist" in app
-- right after running migrations, until the next natural reload)
-- ---------------------------------------------------------------------------

notify pgrst, 'reload schema';
