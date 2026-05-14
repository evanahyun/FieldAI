-- Upgrade from 0001: invite codes, join-by-invite, demo seed append mode

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
