create table if not exists user_preferences (
  user_id   uuid primary key references users(id) on delete cascade,
  theme     text not null default 'dark',
  palette   text not null default 'duck-egg',
  updated_at timestamptz not null default now()
);
