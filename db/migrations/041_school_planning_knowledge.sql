-- School-controlled planning knowledge for critical-thinking lesson generation

create table if not exists school_lesson_structures (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,
  description text,
  source text not null default 'custom', -- custom | eef_metacognition | rosenhine
  sections jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists school_lesson_structures_school_idx
  on school_lesson_structures(school_id, active, updated_at desc);

alter table school_lesson_structures enable row level security;

create policy "School members can read lesson structures"
  on school_lesson_structures
  for select
  using (
    exists (
      select 1 from user_profile_settings ups
      where ups.user_id = auth.uid()
        and ups.school_id = school_lesson_structures.school_id
    )
  );

create policy "School admins can manage lesson structures"
  on school_lesson_structures
  for all
  using (
    exists (
      select 1 from user_profile_settings ups
      where ups.user_id = auth.uid()
        and ups.school_id = school_lesson_structures.school_id
        and ups.school_role = 'admin'
    )
  );

create table if not exists school_unit_plans (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  year_group text not null,
  subject text not null,
  term text,
  title text not null,
  unit_summary text,
  experiences text,
  end_points text,
  vocabulary jsonb not null default '[]'::jsonb,
  progression jsonb not null default '[]'::jsonb,
  source_document_name text,
  source_text text,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists school_unit_plans_school_subject_idx
  on school_unit_plans(school_id, year_group, subject, active, updated_at desc);

alter table school_unit_plans enable row level security;

create policy "School members can read unit plans"
  on school_unit_plans
  for select
  using (
    exists (
      select 1 from user_profile_settings ups
      where ups.user_id = auth.uid()
        and ups.school_id = school_unit_plans.school_id
    )
  );

create policy "School admins can manage unit plans"
  on school_unit_plans
  for all
  using (
    exists (
      select 1 from user_profile_settings ups
      where ups.user_id = auth.uid()
        and ups.school_id = school_unit_plans.school_id
        and ups.school_role = 'admin'
    )
  );

create table if not exists class_pupil_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  school_id uuid references schools(id) on delete set null,
  pseudonym text not null,
  year_group text,
  home_languages text[] not null default '{}',
  eal_stage text,
  send_needs text[] not null default '{}',
  attainment text,
  reading_age text,
  interests text,
  current_next_step text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_pupil_profiles_user_pseudonym_unique unique (user_id, pseudonym)
);

create index if not exists class_pupil_profiles_user_idx
  on class_pupil_profiles(user_id, active, pseudonym);

create index if not exists class_pupil_profiles_school_idx
  on class_pupil_profiles(school_id)
  where school_id is not null;

alter table class_pupil_profiles enable row level security;

create policy "Teachers manage their pupil planning profiles"
  on class_pupil_profiles
  for all
  using (auth.uid() = user_id);

create table if not exists critical_planning_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  school_id uuid references schools(id) on delete set null,
  unit_id uuid references school_unit_plans(id) on delete set null,
  lesson_structure_id uuid references school_lesson_structures(id) on delete set null,
  year_group text not null,
  subject text not null,
  topic text not null,
  sequence_position text,
  last_lesson_afl text not null,
  adjustments text,
  focus_pupils jsonb not null default '[]'::jsonb,
  next_steps jsonb not null default '[]'::jsonb,
  quick_plan boolean not null default false,
  generated_context text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists critical_planning_drafts_user_idx
  on critical_planning_drafts(user_id, created_at desc);

alter table critical_planning_drafts enable row level security;

create policy "Teachers manage their critical planning drafts"
  on critical_planning_drafts
  for all
  using (auth.uid() = user_id);
