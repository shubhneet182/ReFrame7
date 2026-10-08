-- Run in the Supabase SQL editor. Matches ThoughtRecord in types/index.ts.

create table if not exists public.thought_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  situation text not null default '',
  moods jsonb not null default '[]'::jsonb,
  automatic_thoughts text not null default '',
  hot_thought text not null default '',
  evidence_for text not null default '',
  evidence_against text not null default '',
  balanced_thought text not null default '',
  balanced_thought_ai text,
  balanced_belief smallint check (balanced_belief between 0 and 100),
  outcome_moods jsonb not null default '[]'::jsonb,
  is_complete boolean not null default false,
  similar_record_id uuid references public.thought_records (id) on delete set null,
  crisis_flagged boolean not null default false,
  ai_enabled boolean not null default false
);

create index if not exists thought_records_user_created_idx
  on public.thought_records (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists thought_records_set_updated_at on public.thought_records;
create trigger thought_records_set_updated_at
  before update on public.thought_records
  for each row execute function public.set_updated_at();

alter table public.thought_records enable row level security;

create policy "Users read own records"
  on public.thought_records for select
  using (auth.uid() = user_id);

create policy "Users insert own records"
  on public.thought_records for insert
  with check (auth.uid() = user_id);

create policy "Users update own records"
  on public.thought_records for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own records"
  on public.thought_records for delete
  using (auth.uid() = user_id);
