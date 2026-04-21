-- National Curriculum objectives reference table (seeded, not user-generated)
create table if not exists nc_objectives (
  id          uuid    primary key default gen_random_uuid(),
  key_stage   text    not null,   -- ks1 | ks2
  year_group  text    not null,   -- year-1 | year-2 | year-3 | year-4 | year-5 | year-6 | ks1 | ks2
  subject     text    not null,
  strand      text    not null,   -- sub-area within subject
  code        text    not null unique,  -- e.g. KS1-ENG-WR-01
  description text    not null,

  constraint nc_objectives_ks_check
    check (key_stage in ('ks1','ks2'))
);

create index if not exists nc_objectives_subject_idx
  on nc_objectives(key_stage, subject, year_group);
