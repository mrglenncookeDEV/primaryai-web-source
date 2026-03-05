alter table personal_tasks
  add column if not exists due_time time;

create index if not exists personal_tasks_user_due_time_idx
  on personal_tasks(user_id, due_date, due_time);

