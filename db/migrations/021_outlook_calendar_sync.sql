create table if not exists outlook_calendar_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  microsoft_user_id text,
  email text,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists outlook_calendar_connections_email_idx
  on outlook_calendar_connections(email);

alter table lesson_schedule
  add column if not exists external_source text,
  add column if not exists external_event_id text;

create unique index if not exists lesson_schedule_external_event_unique_idx
  on lesson_schedule(user_id, external_source, external_event_id)
  where external_source is not null and external_event_id is not null;

create index if not exists lesson_schedule_external_source_idx
  on lesson_schedule(user_id, external_source);
