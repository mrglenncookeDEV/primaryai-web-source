create table if not exists user_profile_setup (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text not null default '',
  profile_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_profile_setup_completed_idx on user_profile_setup(profile_completed);
