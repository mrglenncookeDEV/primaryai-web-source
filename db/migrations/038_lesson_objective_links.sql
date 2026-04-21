-- Junction: links lesson_schedule events to NC objectives
create table if not exists lesson_objective_links (
  id             uuid  primary key default gen_random_uuid(),
  user_id        uuid  not null references auth.users(id) on delete cascade,
  schedule_event_id uuid not null references lesson_schedule(id) on delete cascade,
  objective_id   uuid  not null references nc_objectives(id) on delete cascade,
  created_at     timestamptz not null default now(),

  constraint lesson_objective_links_unique
    unique (schedule_event_id, objective_id)
);

create index if not exists lesson_objective_links_event_idx
  on lesson_objective_links(schedule_event_id);

create index if not exists lesson_objective_links_user_idx
  on lesson_objective_links(user_id, objective_id);
