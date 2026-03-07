alter table lesson_schedule
  add column if not exists outlook_event_id text,
  add column if not exists outlook_last_synced_at timestamptz;

create index if not exists lesson_schedule_outlook_event_id_idx
  on lesson_schedule(user_id, outlook_event_id)
  where outlook_event_id is not null;
