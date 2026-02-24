create table if not exists users (
  id uuid primary key,
  email text not null unique,
  role text not null default 'owner',
  created_at timestamptz not null default now()
);
