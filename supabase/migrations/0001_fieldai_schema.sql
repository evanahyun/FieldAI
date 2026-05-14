-- FieldAI: multi-tenant schema, RLS, helper RPCs
-- Run in Supabase SQL Editor or: supabase db push (linked project)

create extension if not exists "pgcrypto";

-- Tables
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trade_type text,
  phone text,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
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

-- updated_at trigger for ai_settings
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

-- Helper: membership check (do not use user_metadata for authz)
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

-- RPC: create company + membership + default ai_settings atomically
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
  values (p_name, p_trade_type, p_phone, auth.uid())
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

-- RPC: idempotent demo content for local/testing (only when company has zero leads)
create or replace function public.seed_demo_for_my_company()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid;
  v_lead1 uuid;
  v_lead2 uuid;
  v_lead3 uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select cu.company_id into v_company
  from public.company_users cu
  where cu.user_id = auth.uid()
  order by cu.created_at asc
  limit 1;

  if v_company is null then
    raise exception 'No company membership';
  end if;

  if (select count(*)::int from public.leads where company_id = v_company) > 0 then
    return;
  end if;

  insert into public.leads (
    company_id, customer_name, customer_phone, service_address, issue_type, urgency, status, preferred_time, summary, transcript
  ) values (
    v_company,
    'Jordan Lee',
    '(555) 201-4491',
    '1420 Oak St, Springfield',
    'Sewer line backup in basement floor drain',
    'emergency',
    'New',
    'ASAP today',
    'Caller reports sewage smell and slow drains throughout the house; water rising near floor drain.',
    'Agent: Thanks for calling — what''s going on at the property?\nCaller: Basement drain is gurgling and there''s a sewage smell.\nAgent: Any backups or standing water?\nCaller: Not yet, but it''s getting worse.'
  ) returning id into v_lead1;

  insert into public.leads (
    company_id, customer_name, customer_phone, service_address, issue_type, urgency, status, preferred_time, summary, transcript
  ) values (
    v_company,
    'Priya Patel',
    '(555) 883-1022',
    '88 River Rd, Springfield',
    'Trenchless pipe lining estimate',
    'medium',
    'Contacted',
    'Thursday afternoon',
    'Homeowner wants a camera inspection and lining quote for older clay lateral.',
    'Caller interested in lining vs dig; no active backup.'
  ) returning id into v_lead2;

  insert into public.leads (
    company_id, customer_name, customer_phone, service_address, issue_type, urgency, status, preferred_time, summary, transcript
  ) values (
    v_company,
    'Chris Morgan',
    '(555) 774-8890',
    '55 Hillview Ave, Springfield',
    'Hydro jetting for kitchen line',
    'low',
    'Booked',
    'Tomorrow 9–11am',
    'Grease-related slow kitchen drain; scheduled jetting window.',
    'Routine maintenance; booked dispatch.'
  ) returning id into v_lead3;

  insert into public.calls (company_id, lead_id, caller_phone, call_status, transcript, summary, urgency, started_at, ended_at)
  values (
    v_company,
    v_lead1,
    '(555) 201-4491',
    'completed',
    'See lead transcript',
    'Emergency triage — possible sewer backup.',
    'emergency',
    now() - interval '25 minutes',
    now() - interval '20 minutes'
  );

  insert into public.calls (company_id, lead_id, caller_phone, call_status, transcript, summary, urgency, started_at, ended_at)
  values (
    v_company,
    v_lead2,
    '(555) 883-1022',
    'completed',
    'See lead transcript',
    'Estimate request for trenchless lining.',
    'medium',
    now() - interval '3 hours',
    now() - interval '2 hours 50 minutes'
  );

  insert into public.appointments (company_id, lead_id, appointment_time, notes, status)
  values (
    v_company,
    v_lead3,
    now() + interval '1 day',
    'Hydro jet kitchen line; tech to call 15 min prior.',
    'scheduled'
  );

  insert into public.appointments (company_id, lead_id, appointment_time, notes, status)
  values (
    v_company,
    v_lead2,
    now() + interval '3 days',
    'Camera inspection + estimate for lining.',
    'scheduled'
  );
end;
$$;

revoke all on function public.seed_demo_for_my_company() from public;
grant execute on function public.seed_demo_for_my_company() to authenticated;

-- RLS
alter table public.companies enable row level security;
alter table public.company_users enable row level security;
alter table public.leads enable row level security;
alter table public.calls enable row level security;
alter table public.appointments enable row level security;
alter table public.ai_settings enable row level security;

-- companies
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

-- company_users: read membership for your companies; no direct client inserts
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

-- leads
drop policy if exists leads_select on public.leads;
create policy leads_select on public.leads for select using (public.is_company_member(company_id));
drop policy if exists leads_insert on public.leads;
create policy leads_insert on public.leads for insert with check (public.is_company_member(company_id));
drop policy if exists leads_update on public.leads;
create policy leads_update on public.leads for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
drop policy if exists leads_delete on public.leads;
create policy leads_delete on public.leads for delete using (public.is_company_member(company_id));

-- calls
drop policy if exists calls_select on public.calls;
create policy calls_select on public.calls for select using (public.is_company_member(company_id));
drop policy if exists calls_insert on public.calls;
create policy calls_insert on public.calls for insert with check (public.is_company_member(company_id));
drop policy if exists calls_update on public.calls;
create policy calls_update on public.calls for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
drop policy if exists calls_delete on public.calls;
create policy calls_delete on public.calls for delete using (public.is_company_member(company_id));

-- appointments
drop policy if exists appt_select on public.appointments;
create policy appt_select on public.appointments for select using (public.is_company_member(company_id));
drop policy if exists appt_insert on public.appointments;
create policy appt_insert on public.appointments for insert with check (public.is_company_member(company_id));
drop policy if exists appt_update on public.appointments;
create policy appt_update on public.appointments for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
drop policy if exists appt_delete on public.appointments;
create policy appt_delete on public.appointments for delete using (public.is_company_member(company_id));

-- ai_settings
drop policy if exists ai_select on public.ai_settings;
create policy ai_select on public.ai_settings for select using (public.is_company_member(company_id));
drop policy if exists ai_insert on public.ai_settings;
create policy ai_insert on public.ai_settings for insert with check (public.is_company_member(company_id));
drop policy if exists ai_update on public.ai_settings;
create policy ai_update on public.ai_settings for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
drop policy if exists ai_delete on public.ai_settings;
create policy ai_delete on public.ai_settings for delete using (public.is_company_member(company_id));
