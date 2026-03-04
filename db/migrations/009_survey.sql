create table if not exists survey_responses (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  part_a jsonb not null default '{}',
  part_b jsonb not null default '{}',
  part_c jsonb not null default '{}',
  part_d jsonb not null default '{}',
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists survey_responses_role_idx on survey_responses(role);
create index if not exists survey_responses_completed_idx on survey_responses(completed);
