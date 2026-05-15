-- FieldAI — Supabase Postgres schema (public) + Auth integration
-- Run in Supabase SQL Editor on a new project, or apply migrations incrementally.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  phone text,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  invite_token text not null default encode(gen_random_bytes(9), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companies_invite_token_key unique (invite_token)
);

create index if not exists idx_companies_owner on public.companies (owner_user_id);

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
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leads_company on public.leads (company_id);
create index if not exists idx_leads_company_created on public.leads (company_id, created_at desc);

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  provider text,
  provider_call_id text,
  caller_phone text,
  call_status text,
  recording_url text,
  transcript text,
  summary text,
  urgency text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_calls_company on public.calls (company_id);
create index if not exists idx_calls_company_created on public.calls (company_id, created_at desc);
create index if not exists idx_calls_lead on public.calls (lead_id);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  appointment_time timestamptz not null,
  notes text,
  status text not null default 'scheduled',
  created_at timestamptz not null default now()
);

create index if not exists idx_appointments_company on public.appointments (company_id);
create index if not exists idx_appointments_time on public.appointments (company_id, appointment_time);

create table if not exists public.ai_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  assistant_name text,
  greeting text,
  tone text,
  business_hours text,
  services_offered text,
  intake_questions text,
  urgency_rules text,
  fallback_instructions text,
  transfer_phone text,
  booking_instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_settings_company_id_key unique (company_id)
);

create index if not exists idx_ai_settings_company on public.ai_settings (company_id);

-- ---------------------------------------------------------------------------
-- Triggers: updated_at
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

drop trigger if exists trg_companies_updated_at on public.companies;
create trigger trg_companies_updated_at
before update on public.companies
for each row
execute procedure public.set_updated_at();

drop trigger if exists trg_leads_updated_at on public.leads;
create trigger trg_leads_updated_at
before update on public.leads
for each row
execute procedure public.set_updated_at();

drop trigger if exists trg_ai_settings_updated_at on public.ai_settings;
create trigger trg_ai_settings_updated_at
before update on public.ai_settings
for each row
execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers & RPCs
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
  p_industry text,
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

  insert into public.companies (name, industry, phone, owner_user_id)
  values (p_name, nullif(p_industry, ''), nullif(p_phone, ''), auth.uid())
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

-- Demo dataset (multi-vertical). p_append=true always inserts more rows (dev).
create or replace function public.seed_demo_for_my_company(p_append boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid;
  v_l uuid;
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

  -- HVAC emergency
  insert into public.leads (company_id, customer_name, customer_phone, service_address, issue_type, urgency, status, preferred_time, summary, transcript, source)
  values (v_company, 'Riley Chen', '(415) 555-0101', '88 Market St, San Francisco, CA', 'No heat — furnace outage', 'emergency', 'New', 'Tonight', 'Furnace stopped working; home below 55°F; elderly resident.', 'Caller: heat went out this afternoon. Agent: triage for no-heat emergency.', 'demo_seed')
  returning id into v_l;
  insert into public.calls (company_id, lead_id, provider, provider_call_id, caller_phone, call_status, recording_url, transcript, summary, urgency, started_at, ended_at)
  values (v_company, v_l, 'demo', 'demo-hvac-1', '(415) 555-0101', 'completed', null, 'Demo transcript: HVAC emergency triage.', 'No heat — elderly resident.', 'emergency', t0 - interval '2 hours', t0 - interval '110 minutes');

  -- Plumbing leak
  insert into public.leads (company_id, customer_name, customer_phone, service_address, issue_type, urgency, status, preferred_time, summary, transcript, source)
  values (v_company, 'Morgan Diaz', '(415) 555-0102', '2200 Mission St, San Francisco, CA', 'Active ceiling leak', 'high', 'New', 'ASAP', 'Water stain spreading on ceiling under upstairs bath.', 'Caller reports dripping after shower use.', 'demo_seed')
  returning id into v_l;
  insert into public.calls (company_id, lead_id, provider, provider_call_id, caller_phone, call_status, recording_url, transcript, summary, urgency, started_at, ended_at)
  values (v_company, v_l, 'demo', 'demo-plumb-1', '(415) 555-0102', 'completed', null, 'Demo transcript: leak intake.', 'Active ceiling leak.', 'high', t0 - interval '90 minutes', t0 - interval '80 minutes');

  -- Electrician estimate
  insert into public.leads (company_id, customer_name, customer_phone, service_address, issue_type, urgency, status, preferred_time, summary, transcript, source)
  values (v_company, 'Alex Park', '(415) 555-0103', '450 Hayes St, San Francisco, CA', 'Panel upgrade estimate', 'medium', 'Contacted', 'Thursday PM', '200A service upgrade; wants ballpark before scheduling inspection.', 'Caller asks about timeline and permits.', 'demo_seed')
  returning id into v_l;
  insert into public.calls (company_id, lead_id, provider, provider_call_id, caller_phone, call_status, recording_url, transcript, summary, urgency, started_at, ended_at)
  values (v_company, v_l, 'demo', 'demo-elec-1', '(415) 555-0103', 'completed', null, 'Demo transcript: estimate questions.', 'Panel upgrade estimate.', 'medium', t0 - interval '1 day', t0 - interval '1 day' + interval '12 minutes');

  -- Roofing inspection
  insert into public.leads (company_id, customer_name, customer_phone, service_address, issue_type, urgency, status, preferred_time, summary, transcript, source)
  values (v_company, 'Jordan Lee', '(415) 555-0104', '10 Sunset Blvd, Daly City, CA', 'Roof inspection before rain', 'high', 'New', 'Tomorrow morning', 'Missing shingles noted; wants inspection before forecasted storm.', 'Caller mentions recent wind event.', 'demo_seed')
  returning id into v_l;
  insert into public.calls (company_id, lead_id, provider, provider_call_id, caller_phone, call_status, recording_url, transcript, summary, urgency, started_at, ended_at)
  values (v_company, v_l, 'demo', 'demo-roof-1', '(415) 555-0104', 'completed', null, 'Demo transcript: roof scheduling.', 'Roof inspection before rain.', 'high', t0 - interval '30 minutes', t0 - interval '20 minutes');

  -- Landscaping quote
  insert into public.leads (company_id, customer_name, customer_phone, service_address, issue_type, urgency, status, preferred_time, summary, transcript, source)
  values (v_company, 'Sam Rivera', '(415) 555-0105', '1200 El Camino Real, Burlingame, CA', 'Weekly maintenance + spring cleanup', 'low', 'New', 'Any weekday morning', 'Residential lot ~4k sq ft; wants recurring service.', 'Caller asks about organic options.', 'demo_seed')
  returning id into v_l;
  insert into public.calls (company_id, lead_id, provider, provider_call_id, caller_phone, call_status, recording_url, transcript, summary, urgency, started_at, ended_at)
  values (v_company, v_l, 'demo', 'demo-land-1', '(415) 555-0105', 'completed', null, 'Demo transcript: maintenance quote.', 'Landscaping quote.', 'low', t0 - interval '3 hours', t0 - interval '175 minutes');

  -- Med spa appointment
  insert into public.leads (company_id, customer_name, customer_phone, service_address, issue_type, urgency, status, preferred_time, summary, transcript, source)
  values (v_company, 'Taylor Brooks', '(415) 555-0106', '500 Union Square, San Francisco, CA', 'Hydrafacial — first visit', 'low', 'New', 'Saturday 10am', 'New client; sensitive skin; wants consultation slot.', 'Caller asks about contraindications.', 'demo_seed')
  returning id into v_l;
  insert into public.calls (company_id, lead_id, provider, provider_call_id, caller_phone, call_status, recording_url, transcript, summary, urgency, started_at, ended_at)
  values (v_company, v_l, 'demo', 'demo-spa-1', '(415) 555-0106', 'completed', null, 'Demo transcript: booking intake.', 'Med spa first visit.', 'low', t0 - interval '6 hours', t0 - interval '350 minutes');

  -- Cleaning request
  insert into public.leads (company_id, customer_name, customer_phone, service_address, issue_type, urgency, status, preferred_time, summary, transcript, source)
  values (v_company, 'Casey Nguyen', '(415) 555-0107', '900 Bush St, San Francisco, CA', 'Move-out deep clean (2BR)', 'medium', 'New', 'End of month', 'Moving out 6/30; needs deep clean + oven/fridge.', 'Caller asks for eco products.', 'demo_seed')
  returning id into v_l;
  insert into public.calls (company_id, lead_id, provider, provider_call_id, caller_phone, call_status, recording_url, transcript, summary, urgency, started_at, ended_at)
  values (v_company, v_l, 'demo', 'demo-clean-1', '(415) 555-0107', 'completed', null, 'Demo transcript: scope and pricing.', 'Move-out deep clean.', 'medium', t0 - interval '45 minutes', t0 - interval '35 minutes');

  insert into public.appointments (company_id, lead_id, appointment_time, notes, status)
  values
    (v_company, v_l, t0 + interval '4 days', 'Deep clean — confirm eco product list.', 'scheduled');
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
