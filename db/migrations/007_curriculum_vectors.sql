create table if not exists curriculum_vectors (
  id text primary key,
  year_group text,
  subject text,
  content text,
  embedding blob
);

create index if not exists curriculum_vectors_year_subject_idx
on curriculum_vectors(year_group, subject);
