create table if not exists calendar_sync_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_sync_tokens_token_idx
  on calendar_sync_tokens(token);
