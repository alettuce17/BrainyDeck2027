-- Brainy Deck: dedicated spaced-repetition progress storage.
-- Safe to run after the original 001_initial.sql migration.

create table if not exists public.study_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id uuid not null references public.decks(id) on delete cascade,
  card_id text not null,
  rating text null check (rating is null or rating in ('again', 'hard', 'good', 'easy')),
  times_reviewed integer not null default 0 check (times_reviewed >= 0),
  last_reviewed timestamptz null,
  next_review_at timestamptz null,
  interval_minutes integer null check (interval_minutes is null or interval_minutes >= 0),
  ease_factor double precision null,
  repetitions integer null check (repetitions is null or repetitions >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, deck_id, card_id)
);

create index if not exists study_progress_user_due_idx
  on public.study_progress (user_id, next_review_at);

alter table public.study_progress enable row level security;

drop policy if exists "Study progress can be read by owner" on public.study_progress;
create policy "Study progress can be read by owner"
  on public.study_progress
  for select
  using (auth.uid() = user_id);

drop policy if exists "Study progress can be inserted by owner" on public.study_progress;
create policy "Study progress can be inserted by owner"
  on public.study_progress
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Study progress can be updated by owner" on public.study_progress;
create policy "Study progress can be updated by owner"
  on public.study_progress
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Study progress can be deleted by owner" on public.study_progress;
create policy "Study progress can be deleted by owner"
  on public.study_progress
  for delete
  using (auth.uid() = user_id);
