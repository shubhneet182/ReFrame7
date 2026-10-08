-- Run once in the Supabase SQL editor if thought_records was created before
-- the belief rating existed. (schema.sql already includes this column.)

alter table public.thought_records
  add column if not exists balanced_belief smallint
  check (balanced_belief between 0 and 100);
