-- Run this once in Supabase SQL Editor.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.decks (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.decks enable row level security;

create policy "Profiles can be read by owner" on public.profiles
  for select using (auth.uid() = id);
create policy "Profiles can be inserted by owner" on public.profiles
  for insert with check (auth.uid() = id);
create policy "Profiles can be updated by owner" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Decks can be read by owner" on public.decks
  for select using (auth.uid() = user_id);
create policy "Decks can be inserted by owner" on public.decks
  for insert with check (auth.uid() = user_id);
create policy "Decks can be updated by owner" on public.decks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Decks can be deleted by owner" on public.decks
  for delete using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
