-- Teacher notes: free-text notes optionally linked to lesson packs / schedule events
create table if not exists teacher_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  -- Optional links
  lesson_pack_id uuid references lesson_packs(id) on delete set null,
  schedule_event_id uuid references lesson_schedule(id) on delete set null,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teacher_notes_user_idx on teacher_notes (user_id, updated_at desc);
create index if not exists teacher_notes_pack_idx on teacher_notes (lesson_pack_id) where lesson_pack_id is not null;
create index if not exists teacher_notes_event_idx on teacher_notes (schedule_event_id) where schedule_event_id is not null;

alter table teacher_notes enable row level security;

create policy "Users manage their own notes"
  on teacher_notes for all using (auth.uid() = user_id);

-- Note attachments: files (images, PDFs, docs) attached to a note
create table if not exists note_attachments (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references teacher_notes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  size_bytes bigint not null default 0,
  mime_type text,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists note_attachments_note_idx on note_attachments (note_id, created_at);

alter table note_attachments enable row level security;

create policy "Users manage their own note attachments"
  on note_attachments for all using (auth.uid() = user_id);
