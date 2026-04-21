-- Schools table for multi-seat licensing
create table if not exists schools (
  id            uuid    primary key default gen_random_uuid(),
  name          text    not null,
  urn           text,                   -- Ofsted URN, optional
  postcode      text,
  plan          text    not null default 'school_starter',
  seat_limit    int     not null default 10,
  admin_user_id uuid    references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Link users to a school
alter table user_profile_settings
  add column if not exists school_id  uuid references schools(id) on delete set null,
  add column if not exists school_role text;  -- admin | staff

alter table user_profile_settings
  add constraint if not exists user_profile_school_role_check
    check (school_role in ('admin','staff'));

create index if not exists schools_admin_idx
  on schools(admin_user_id);

create index if not exists user_profile_school_idx
  on user_profile_settings(school_id)
  where school_id is not null;

-- School invites (token-based)
create table if not exists school_invites (
  id          uuid    primary key default gen_random_uuid(),
  school_id   uuid    not null references schools(id) on delete cascade,
  email       text    not null,
  token       text    not null unique default encode(gen_random_bytes(24), 'hex'),
  accepted_at timestamptz,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  created_at  timestamptz not null default now()
);

create index if not exists school_invites_token_idx
  on school_invites(token);

create index if not exists school_invites_school_idx
  on school_invites(school_id);
