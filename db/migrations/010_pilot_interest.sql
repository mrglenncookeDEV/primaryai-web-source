create table if not exists pilot_interest (
  id uuid primary key default gen_random_uuid(),
  survey_response_id uuid not null references survey_responses(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  unique(survey_response_id, email)
);

create index if not exists pilot_interest_survey_response_idx on pilot_interest(survey_response_id);
create index if not exists pilot_interest_email_idx on pilot_interest(email);
