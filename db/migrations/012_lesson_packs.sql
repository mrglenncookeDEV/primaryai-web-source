create table if not exists lesson_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  year_group text not null,
  subject text not null,
  topic text not null,
  json text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lesson_packs_user_id_created_at_idx on lesson_packs (user_id, created_at desc);

alter table lesson_packs enable row level security;

create policy "Users can manage their own lesson packs"
  on lesson_packs
  for all
  using (auth.uid() = user_id);
