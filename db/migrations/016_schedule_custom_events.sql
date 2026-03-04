alter table lesson_schedule
  alter column lesson_pack_id drop not null;

alter table lesson_schedule
  add column if not exists event_type text not null default 'lesson_pack',
  add column if not exists event_category text;

create index if not exists lesson_schedule_event_type_idx
  on lesson_schedule(event_type);

create index if not exists lesson_schedule_event_category_idx
  on lesson_schedule(event_category);
