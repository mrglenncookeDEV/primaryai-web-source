-- Add whiteboard support to teacher_notes
ALTER TABLE teacher_notes
  ADD COLUMN IF NOT EXISTS note_type TEXT NOT NULL DEFAULT 'text'
    CHECK (note_type IN ('text', 'whiteboard')),
  ADD COLUMN IF NOT EXISTS content_json JSONB;
