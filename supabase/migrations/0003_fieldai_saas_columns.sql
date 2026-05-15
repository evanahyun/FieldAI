-- FieldAI evolution: industry, lead/call metadata, expanded ai_settings, RPC rename trade→industry

-- Companies: industry + updated_at
alter table public.companies add column if not exists industry text;
update public.companies set industry = coalesce(industry, trade_type) where exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'companies' and column_name = 'trade_type'
);
alter table public.companies drop column if exists trade_type;
alter table public.companies add column if not exists updated_at timestamptz not null default now();
update public.companies set updated_at = created_at where updated_at is null;

drop trigger if exists trg_companies_updated_at on public.companies;
create trigger trg_companies_updated_at
before update on public.companies
for each row execute procedure public.set_updated_at();

-- Leads: source + updated_at
alter table public.leads add column if not exists source text;
alter table public.leads add column if not exists updated_at timestamptz not null default now();
update public.leads set updated_at = created_at where updated_at is null;

drop trigger if exists trg_leads_updated_at on public.leads;
create trigger trg_leads_updated_at
before update on public.leads
for each row execute procedure public.set_updated_at();

-- Calls: provider metadata
alter table public.calls add column if not exists provider text;
alter table public.calls add column if not exists provider_call_id text;
alter table public.calls add column if not exists recording_url text;

-- ai_settings: new columns, migrate emergency_rules → urgency_rules
alter table public.ai_settings add column if not exists tone text;
alter table public.ai_settings add column if not exists intake_questions text;
alter table public.ai_settings add column if not exists urgency_rules text;
alter table public.ai_settings add column if not exists transfer_phone text;
alter table public.ai_settings add column if not exists booking_instructions text;

update public.ai_settings
set urgency_rules = coalesce(urgency_rules, emergency_rules)
where exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'ai_settings' and column_name = 'emergency_rules'
);
alter table public.ai_settings drop column if exists emergency_rules;

-- RPC: replace create_company_with_owner signature (drop old overloads)
drop function if exists public.create_company_with_owner(text, text, text);

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

-- Refresh demo seed (multi-vertical)
drop function if exists public.seed_demo_for_my_company();
drop function if exists public.seed_demo_for_my_company(boolean);

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

  select cu.company_id into v_company
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

  insert into public.leads (company_id, customer_name, customer_phone, service_address, issue_type, urgency, status, preferred_time, summary, transcript, source)
  values (v_company, 'Riley Chen', '(415) 555-0101', '88 Market St, San Francisco, CA', 'No heat — furnace outage', 'emergency', 'New', 'Tonight', 'Furnace stopped working; home below 55°F; elderly resident.', 'Caller: heat went out this afternoon. Agent: triage for no-heat emergency.', 'demo_seed')
  returning id into v_l;
  insert into public.calls (company_id, lead_id, provider, provider_call_id, caller_phone, call_status, recording_url, transcript, summary, urgency, started_at, ended_at)
  values (v_company, v_l, 'demo', 'demo-hvac-1', '(415) 555-0101', 'completed', null, 'Demo transcript: HVAC emergency triage.', 'No heat — elderly resident.', 'emergency', t0 - interval '2 hours', t0 - interval '110 minutes');

  insert into public.leads (company_id, customer_name, customer_phone, service_address, issue_type, urgency, status, preferred_time, summary, transcript, source)
  values (v_company, 'Morgan Diaz', '(415) 555-0102', '2200 Mission St, San Francisco, CA', 'Active ceiling leak', 'high', 'New', 'ASAP', 'Water stain spreading on ceiling under upstairs bath.', 'Caller reports dripping after shower use.', 'demo_seed')
  returning id into v_l;
  insert into public.calls (company_id, lead_id, provider, provider_call_id, caller_phone, call_status, recording_url, transcript, summary, urgency, started_at, ended_at)
  values (v_company, v_l, 'demo', 'demo-plumb-1', '(415) 555-0102', 'completed', null, 'Demo transcript: leak intake.', 'Active ceiling leak.', 'high', t0 - interval '90 minutes', t0 - interval '80 minutes');

  insert into public.leads (company_id, customer_name, customer_phone, service_address, issue_type, urgency, status, preferred_time, summary, transcript, source)
  values (v_company, 'Alex Park', '(415) 555-0103', '450 Hayes St, San Francisco, CA', 'Panel upgrade estimate', 'medium', 'Contacted', 'Thursday PM', '200A service upgrade; wants ballpark before scheduling inspection.', 'Caller asks about timeline and permits.', 'demo_seed')
  returning id into v_l;
  insert into public.calls (company_id, lead_id, provider, provider_call_id, caller_phone, call_status, recording_url, transcript, summary, urgency, started_at, ended_at)
  values (v_company, v_l, 'demo', 'demo-elec-1', '(415) 555-0103', 'completed', null, 'Demo transcript: estimate questions.', 'Panel upgrade estimate.', 'medium', t0 - interval '1 day', t0 - interval '1 day' + interval '12 minutes');

  insert into public.leads (company_id, customer_name, customer_phone, service_address, issue_type, urgency, status, preferred_time, summary, transcript, source)
  values (v_company, 'Jordan Lee', '(415) 555-0104', '10 Sunset Blvd, Daly City, CA', 'Roof inspection before rain', 'high', 'New', 'Tomorrow morning', 'Missing shingles noted; wants inspection before forecasted storm.', 'Caller mentions recent wind event.', 'demo_seed')
  returning id into v_l;
  insert into public.calls (company_id, lead_id, provider, provider_call_id, caller_phone, call_status, recording_url, transcript, summary, urgency, started_at, ended_at)
  values (v_company, v_l, 'demo', 'demo-roof-1', '(415) 555-0104', 'completed', null, 'Demo transcript: roof scheduling.', 'Roof inspection before rain.', 'high', t0 - interval '30 minutes', t0 - interval '20 minutes');

  insert into public.leads (company_id, customer_name, customer_phone, service_address, issue_type, urgency, status, preferred_time, summary, transcript, source)
  values (v_company, 'Sam Rivera', '(415) 555-0105', '1200 El Camino Real, Burlingame, CA', 'Weekly maintenance + spring cleanup', 'low', 'New', 'Any weekday morning', 'Residential lot ~4k sq ft; wants recurring service.', 'Caller asks about organic options.', 'demo_seed')
  returning id into v_l;
  insert into public.calls (company_id, lead_id, provider, provider_call_id, caller_phone, call_status, recording_url, transcript, summary, urgency, started_at, ended_at)
  values (v_company, v_l, 'demo', 'demo-land-1', '(415) 555-0105', 'completed', null, 'Demo transcript: maintenance quote.', 'Landscaping quote.', 'low', t0 - interval '3 hours', t0 - interval '175 minutes');

  insert into public.leads (company_id, customer_name, customer_phone, service_address, issue_type, urgency, status, preferred_time, summary, transcript, source)
  values (v_company, 'Taylor Brooks', '(415) 555-0106', '500 Union Square, San Francisco, CA', 'Hydrafacial — first visit', 'low', 'New', 'Saturday 10am', 'New client; sensitive skin; wants consultation slot.', 'Caller asks about contraindications.', 'demo_seed')
  returning id into v_l;
  insert into public.calls (company_id, lead_id, provider, provider_call_id, caller_phone, call_status, recording_url, transcript, summary, urgency, started_at, ended_at)
  values (v_company, v_l, 'demo', 'demo-spa-1', '(415) 555-0106', 'completed', null, 'Demo transcript: booking intake.', 'Med spa first visit.', 'low', t0 - interval '6 hours', t0 - interval '350 minutes');

  insert into public.leads (company_id, customer_name, customer_phone, service_address, issue_type, urgency, status, preferred_time, summary, transcript, source)
  values (v_company, 'Casey Nguyen', '(415) 555-0107', '900 Bush St, San Francisco, CA', 'Move-out deep clean (2BR)', 'medium', 'New', 'End of month', 'Moving out 6/30; needs deep clean + oven/fridge.', 'Caller asks for eco products.', 'demo_seed')
  returning id into v_l;
  insert into public.calls (company_id, lead_id, provider, provider_call_id, caller_phone, call_status, recording_url, transcript, summary, urgency, started_at, ended_at)
  values (v_company, v_l, 'demo', 'demo-clean-1', '(415) 555-0107', 'completed', null, 'Demo transcript: scope and pricing.', 'Move-out deep clean.', 'medium', t0 - interval '45 minutes', t0 - interval '35 minutes');

  insert into public.appointments (company_id, lead_id, appointment_time, notes, status)
  values (v_company, v_l, t0 + interval '4 days', 'Deep clean — confirm eco product list.', 'scheduled');
end;
$$;

revoke all on function public.seed_demo_for_my_company(boolean) from public;
grant execute on function public.seed_demo_for_my_company(boolean) to authenticated;
