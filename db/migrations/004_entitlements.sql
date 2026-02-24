create table if not exists entitlements (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  plan_name text not null,
  feature_flags text[] not null default '{}',
  updated_at timestamptz not null default now(),
  unique(user_id)
);
