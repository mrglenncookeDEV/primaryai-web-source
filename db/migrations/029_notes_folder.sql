-- Add folder_id to teacher_notes so notes can appear in the library
alter table teacher_notes
  add column if not exists folder_id uuid references library_folders(id) on delete set null;

create index if not exists teacher_notes_folder_idx
  on teacher_notes (folder_id) where folder_id is not null;
