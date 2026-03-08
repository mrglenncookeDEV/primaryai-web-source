-- Library folders
create table if not exists library_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists library_folders_user_id_idx on library_folders (user_id, created_at);

alter table library_folders enable row level security;

create policy "Users can manage their own library folders"
  on library_folders
  for all
  using (auth.uid() = user_id);

-- Add folder_id to lesson_packs
alter table lesson_packs add column if not exists folder_id uuid references library_folders(id) on delete set null;

create index if not exists lesson_packs_folder_id_idx on lesson_packs (folder_id);

-- Library documents (user-uploaded files stored in Supabase Storage)
create table if not exists library_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references library_folders(id) on delete set null,
  name text not null,
  size_bytes bigint not null default 0,
  mime_type text,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists library_documents_user_id_idx on library_documents (user_id, created_at desc);
create index if not exists library_documents_folder_id_idx on library_documents (folder_id);

alter table library_documents enable row level security;

create policy "Users can manage their own library documents"
  on library_documents
  for all
  using (auth.uid() = user_id);
