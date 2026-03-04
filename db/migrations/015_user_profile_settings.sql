create table if not exists user_profile_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_year_group text not null default 'Year 4',
  default_subject text not null default 'Maths',
  tone text not null default 'professional_uk',
  school_type text not null default 'primary',
  send_focus boolean not null default false,
  auto_save boolean not null default false,
  format_prefs text not null default '{"slidesStyle":"standard","worksheetStyle":"standard"}',
  class_notes text,
  teaching_approach text,
  ability_mix text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_profile_settings_updated_idx
  on user_profile_settings(updated_at desc);
