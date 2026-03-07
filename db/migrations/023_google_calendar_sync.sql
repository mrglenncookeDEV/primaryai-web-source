create table if not exists google_calendar_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  google_user_id text,
  email text,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists google_calendar_connections_email_idx
  on google_calendar_connections(email);

alter table lesson_schedule
  add column if not exists google_event_id text,
  add column if not exists google_last_synced_at timestamptz;

create index if not exists lesson_schedule_google_event_id_idx
  on lesson_schedule(user_id, google_event_id)
  where google_event_id is not null;
