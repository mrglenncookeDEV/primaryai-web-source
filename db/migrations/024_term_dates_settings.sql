alter table user_profile_settings
  add column if not exists term_name text,
  add column if not exists term_start_date date,
  add column if not exists term_end_date date;
