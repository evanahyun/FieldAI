-- FieldAI 0005: richer call intake fields for lead recovery and scheduling.
-- Safe to run multiple times in Supabase SQL Editor.

alter table public.leads
  add column if not exists service_category text,
  add column if not exists problem_description text,
  add column if not exists appointment_request text,
  add column if not exists internal_notes text;

alter table public.calls
  add column if not exists service_category text,
  add column if not exists appointment_request text,
  add column if not exists internal_notes text;

-- New records use lowercase pipeline states. Keep old rows as-is so no existing
-- dashboard history is rewritten unexpectedly during this MVP migration.

notify pgrst, 'reload schema';
