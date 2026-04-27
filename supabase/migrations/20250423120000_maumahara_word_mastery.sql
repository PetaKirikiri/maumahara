-- Maumahara flashcard app: per-user word mastery (applied via Supabase MCP; keep in sync with remote)
create table if not exists public.maumahara_word_mastery (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  word_text text not null references public.word_registry (word_text) on delete cascade,
  mastery real not null default 0,
  next_review_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint maumahara_word_mastery_mastery_range check (mastery >= 0::real and mastery <= 1::real),
  constraint maumahara_word_mastery_user_word unique (user_id, word_text)
);

create index if not exists maumahara_word_mastery_user_due_idx on public.maumahara_word_mastery (user_id, next_review_at);

alter table public.maumahara_word_mastery enable row level security;

create policy "maumahara_word_mastery_select_own" on public.maumahara_word_mastery for select to authenticated
  using (user_id = (select auth.uid ()));

create policy "maumahara_word_mastery_insert_own" on public.maumahara_word_mastery for insert to authenticated
  with check (user_id = (select auth.uid ()));

create policy "maumahara_word_mastery_update_own" on public.maumahara_word_mastery for update to authenticated
  using (user_id = (select auth.uid ()))
  with check (user_id = (select auth.uid ()));

create policy "maumahara_word_mastery_delete_own" on public.maumahara_word_mastery for delete to authenticated
  using (user_id = (select auth.uid ()));

comment on table public.maumahara_word_mastery is 'Per-user Te Reo word review state for the maumahara flashcard app (0–1 mastery, spaced next_review_at).';
