create table if not exists wellbeing_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  check_date date not null,
  mood int not null check (mood between 1 and 5),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wellbeing_checkins_unique unique (user_id, check_date)
);

create index if not exists wellbeing_checkins_user_date
  on wellbeing_checkins(user_id, check_date desc);
