-- FieldAI — full schema for Supabase (Postgres + Auth)
-- Paste into: Supabase Dashboard → SQL → New query → Run once on a fresh project.
-- Also kept in repo as the canonical reference (see supabase/migrations for incremental history).
--
-- After running this SQL and configuring .env.local:
-- 1) Sign up at /signup (creates Auth user + company + default ai_settings when email confirmation is off).
-- 2) In local dev, open /dashboard/settings → "Load Demo Data" (runs seed_demo_for_my_company(true)).
-- 3) Or POST sample payloads to /api/calls/webhook (requires SUPABASE_SERVICE_ROLE_KEY in .env.local).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trade_type text,
  phone text,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  invite_token text not null default encode(gen_random_bytes(9), 'hex') unique,
  created_at timestamptz not null default now()
);

create table if not exists public.company_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create index if not exists idx_company_users_user on public.company_users (user_id);
create index if not exists idx_company_users_company on public.company_users (company_id);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_name text,
  customer_phone text,
  service_address text,
  issue_type text,
  urgency text,
  status text not null default 'New',
  preferred_time text,
  summary text,
  transcript text,
  created_at timestamptz not null default now()
);

create index if not exists idx_leads_company on public.leads (company_id);
create index if not exists idx_leads_created on public.leads (company_id, created_at desc);

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  caller_phone text,
  call_status text,
  transcript text,
  summary text,
  urgency text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_calls_company on public.calls (company_id);
create index if not exists idx_calls_created on public.calls (company_id, created_at desc);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  appointment_time timestamptz not null,
  notes text,
  status text not null default 'scheduled',
  created_at timestamptz not null default now()
);

create index if not exists idx_appt_company on public.appointments (company_id);

create table if not exists public.ai_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade unique,
  assistant_name text,
  business_hours text,
  emergency_rules text,
  services_offered text,
  greeting text,
  fallback_instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_settings_company on public.ai_settings (company_id);

-- If upgrading an older DB without invite_token, add the column (safe to re-run).
alter table public.companies
  add column if not exists invite_token text;

update public.companies
set invite_token = encode(gen_random_bytes(9), 'hex')
where invite_token is null;

alter table public.companies
  alter column invite_token set default encode(gen_random_bytes(9), 'hex');

alter table public.companies
  alter column invite_token set not null;

create unique index if not exists companies_invite_token_key on public.companies (invite_token);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ai_settings_updated_at on public.ai_settings;
create trigger trg_ai_settings_updated_at
before update on public.ai_settings
for each row
execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Security helpers & RPCs
-- ---------------------------------------------------------------------------

create or replace function public.is_company_member(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_users cu
    where cu.company_id = p_company_id
      and cu.user_id = auth.uid()
  );
$$;

revoke all on function public.is_company_member(uuid) from public;
grant execute on function public.is_company_member(uuid) to authenticated;

create or replace function public.create_company_with_owner(
  p_name text,
  p_trade_type text,
  p_phone text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.company_users where user_id = auth.uid()) then
    raise exception 'User already belongs to a company';
  end if;

  insert into public.companies (name, trade_type, phone, owner_user_id)
  values (p_name, nullif(p_trade_type, ''), nullif(p_phone, ''), auth.uid())
  returning id into v_company_id;

  insert into public.company_users (company_id, user_id, role)
  values (v_company_id, auth.uid(), 'owner');

  insert into public.ai_settings (company_id)
  values (v_company_id)
  on conflict (company_id) do nothing;

  return v_company_id;
end;
$$;

revoke all on function public.create_company_with_owner(text, text, text) from public;
grant execute on function public.create_company_with_owner(text, text, text) to authenticated;

create or replace function public.join_company_by_invite(p_invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.company_users where user_id = auth.uid()) then
    raise exception 'User already belongs to a company';
  end if;

  select c.id
  into v_company_id
  from public.companies c
  where c.invite_token = p_invite_token;

  if v_company_id is null then
    raise exception 'Invalid invite code';
  end if;

  insert into public.company_users (company_id, user_id, role)
  values (v_company_id, auth.uid(), 'member');

  return v_company_id;
end;
$$;

revoke all on function public.join_company_by_invite(text) from public;
grant execute on function public.join_company_by_invite(text) to authenticated;

drop function if exists public.seed_demo_for_my_company();
drop function if exists public.seed_demo_for_my_company(boolean);

-- Demo dataset (4 leads + linked calls). p_append=true inserts even if leads already exist (dev UX).
create or replace function public.seed_demo_for_my_company(p_append boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid;
  v_l1 uuid;
  v_l2 uuid;
  v_l3 uuid;
  v_l4 uuid;
  t0 timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select cu.company_id
  into v_company
  from public.company_users cu
  where cu.user_id = auth.uid()
  order by cu.created_at asc
  limit 1;

  if v_company is null then
    raise exception 'No company membership';
  end if;

  if not p_append and (select count(*)::int from public.leads where company_id = v_company) > 0 then
    return;
  end if;

  insert into public.leads (
    company_id, customer_name, customer_phone, service_address, issue_type, urgency, status, preferred_time, summary, transcript
  ) values (
    v_company,
    'Alex Rivera',
    '(916) 555-0142',
    '1200 J St, Sacramento, CA',
    'Emergency sewer backup',
    'emergency',
    'New',
    'ASAP',
    'Sewage backing up into bathtub and shower; strong odor; multiple fixtures affected.',
    'Agent: Is water or sewage visible in the tub or shower?\nCaller: Yes — it came up after flushing.\nAgent: Please avoid using water and we will dispatch.'
  ) returning id into v_l1;

  insert into public.leads (
    company_id, customer_name, customer_phone, service_address, issue_type, urgency, status, preferred_time, summary, transcript
  ) values (
    v_company,
    'Sam Nguyen',
    '(916) 555-0199',
    '44 Oak Park Dr, Sacramento, CA',
    'Slow drain',
    'low',
    'New',
    'Any afternoon this week',
    'Kitchen sink draining slowly; no backup yet; likely grease buildup.',
    'Caller reports slow kitchen drain for ~2 weeks; disposal runs fine.'
  ) returning id into v_l2;

  insert into public.leads (
    company_id, customer_name, customer_phone, service_address, issue_type, urgency, status, preferred_time, summary, transcript
  ) values (
    v_company,
    'Jordan Kim',
    '(916) 555-0177',
    '901 River Rd, West Sacramento, CA',
    'Camera inspection request',
    'medium',
    'Contacted',
    'Friday morning',
    'Homeowner wants mainline camera inspection before listing the home.',
    'Caller wants recording and location notes for disclosure packet.'
  ) returning id into v_l3;

  insert into public.leads (
    company_id, customer_name, customer_phone, service_address, issue_type, urgency, status, preferred_time, summary, transcript
  ) values (
    v_company,
    'Taylor Brooks',
    '(916) 555-0103',
    '3001 Capitol Ave, Sacramento, CA',
    'Trenchless replacement estimate',
    'medium',
    'New',
    'Next Tuesday',
    'Older clay lateral with root intrusion; interested in lining vs open-cut replacement.',
    'Caller emailed prior photos; wants ballpark and onsite estimate.'
  ) returning id into v_l4;

  insert into public.calls (company_id, lead_id, caller_phone, call_status, transcript, summary, urgency, started_at, ended_at)
  values
    (v_company, v_l1, '(916) 555-0142', 'completed',
     'Full transcript: emergency triage completed; advised to stop water use.',
     'Emergency sewer backup — multiple fixtures affected.', 'emergency', t0 - interval '40 minutes', t0 - interval '32 minutes'),
    (v_company, v_l2, '(916) 555-0199', 'completed',
     'Full transcript: slow drain intake; scheduled routine service window.',
     'Slow kitchen drain — likely grease.', 'low', t0 - interval '6 hours', t0 - interval '5 hours 50 minutes'),
    (v_company, v_l3, '(916) 555-0177', 'completed',
     'Full transcript: camera inspection scope confirmed.',
     'Pre-listing camera inspection request.', 'medium', t0 - interval '2 days', t0 - interval '2 days' + interval '8 minutes'),
    (v_company, v_l4, '(916) 555-0103', 'completed',
     'Full transcript: trenchless options explained at high level.',
     'Trenchless replacement estimate request.', 'medium', t0 - interval '30 minutes', t0 - interval '22 minutes');

  insert into public.appointments (company_id, lead_id, appointment_time, notes, status)
  values
    (v_company, v_l3, t0 + interval '3 days', 'Camera inspection — homeowner will meet onsite.', 'scheduled'),
    (v_company, v_l4, t0 + interval '5 days', 'Estimate visit for lining vs replacement options.', 'scheduled');
end;
$$;

revoke all on function public.seed_demo_for_my_company(boolean) from public;
grant execute on function public.seed_demo_for_my_company(boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.companies enable row level security;
alter table public.company_users enable row level security;
alter table public.leads enable row level security;
alter table public.calls enable row level security;
alter table public.appointments enable row level security;
alter table public.ai_settings enable row level security;

drop policy if exists companies_select_member on public.companies;
create policy companies_select_member
on public.companies
for select
using (public.is_company_member(id) or owner_user_id = auth.uid());

drop policy if exists companies_update_member on public.companies;
create policy companies_update_member
on public.companies
for update
using (public.is_company_member(id))
with check (public.is_company_member(id));

drop policy if exists company_users_select on public.company_users;
create policy company_users_select
on public.company_users
for select
using (user_id = auth.uid() or public.is_company_member(company_id));

drop policy if exists company_users_no_insert on public.company_users;
create policy company_users_no_insert
on public.company_users
for insert
with check (false);

drop policy if exists leads_select on public.leads;
create policy leads_select on public.leads for select using (public.is_company_member(company_id));
drop policy if exists leads_insert on public.leads;
create policy leads_insert on public.leads for insert with check (public.is_company_member(company_id));
drop policy if exists leads_update on public.leads;
create policy leads_update on public.leads for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
drop policy if exists leads_delete on public.leads;
create policy leads_delete on public.leads for delete using (public.is_company_member(company_id));

drop policy if exists calls_select on public.calls;
create policy calls_select on public.calls for select using (public.is_company_member(company_id));
drop policy if exists calls_insert on public.calls;
create policy calls_insert on public.calls for insert with check (public.is_company_member(company_id));
drop policy if exists calls_update on public.calls;
create policy calls_update on public.calls for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
drop policy if exists calls_delete on public.calls;
create policy calls_delete on public.calls for delete using (public.is_company_member(company_id));

drop policy if exists appt_select on public.appointments;
create policy appt_select on public.appointments for select using (public.is_company_member(company_id));
drop policy if exists appt_insert on public.appointments;
create policy appt_insert on public.appointments for insert with check (public.is_company_member(company_id));
drop policy if exists appt_update on public.appointments;
create policy appt_update on public.appointments for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
drop policy if exists appt_delete on public.appointments;
create policy appt_delete on public.appointments for delete using (public.is_company_member(company_id));

drop policy if exists ai_select on public.ai_settings;
create policy ai_select on public.ai_settings for select using (public.is_company_member(company_id));
drop policy if exists ai_insert on public.ai_settings;
create policy ai_insert on public.ai_settings for insert with check (public.is_company_member(company_id));
drop policy if exists ai_update on public.ai_settings;
create policy ai_update on public.ai_settings for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
drop policy if exists ai_delete on public.ai_settings;
create policy ai_delete on public.ai_settings for delete using (public.is_company_member(company_id));

-- ---------------------------------------------------------------------------
-- Optional static demo seed (requires real auth.users UUIDs — not runnable as-is)
-- ---------------------------------------------------------------------------
-- After you create a test user in Authentication, you can link demo rows by
-- replacing OWNER_UUID and COMPANY_UUID below, then uncomment and run.
--
-- insert into public.companies (id, name, trade_type, phone, owner_user_id)
-- values ('COMPANY_UUID', 'Demo Trenchless Co.', 'trenchless_sewer', '(916) 555-0100', 'OWNER_UUID');
--
-- insert into public.company_users (company_id, user_id, role)
-- values ('COMPANY_UUID', 'OWNER_UUID', 'owner');
--
-- insert into public.ai_settings (company_id, assistant_name, business_hours)
-- values ('COMPANY_UUID', 'Alex', 'Mon–Fri 7am–6pm')
-- on conflict (company_id) do nothing;
