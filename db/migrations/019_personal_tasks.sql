create table if not exists personal_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  due_date date not null,
  importance text not null default 'low',
  completed boolean not null default false,
  schedule_event_id uuid references lesson_schedule(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personal_tasks_importance_check check (importance in ('low', 'high'))
);

create index if not exists personal_tasks_user_due_idx
  on personal_tasks(user_id, due_date);

create index if not exists personal_tasks_user_completed_idx
  on personal_tasks(user_id, completed);

