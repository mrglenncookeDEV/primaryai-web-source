create table if not exists user_profile_terms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  term_name text not null,
  term_start_date date not null,
  term_end_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint user_profile_terms_dates_check
    check (term_end_date >= term_start_date)
);

create index if not exists user_profile_terms_user_start_idx
  on user_profile_terms(user_id, term_start_date asc);
