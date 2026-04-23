# FEATURE-001 — Show-working lesson planner

> Status: spec v1.0 — 22 April 2026
> Implementer: Claude Code / human developer
> Principles cross-check: upholds all six principles in `../strategy/02-product-principles.md` (primarily 2, 3, 4, 5)
> OECD mapping: *Engage with AI* (evaluate AI outputs); *Create with AI* (collaborate to elicit feedback and refine)

## 1. Overview

The show-working lesson planner is PrimaryAI's flagship teacher-facing feature. A KS2 teacher enters a curriculum objective, year group, subject and lightweight class context; PrimaryAI generates a complete lesson plan **alongside the pedagogical rationale for every significant choice**. The teacher can accept, revise or reject any section, and export the final plan as PDF, DOCX or copy-to-clipboard.

The feature is the concrete instantiation of principle 3 (default to show-working). It is also the data source for the telemetry that principle 5 requires.

## 2. Goals and non-goals

### Goals

- Reduce KS2 lesson planning time by at least 30% (EEF benchmark), without quality loss as perceived by teacher and by independent review.
- Make every pedagogical choice in a generated plan visible and questionable.
- Generate the telemetry needed for future EEF-equivalent evaluation.
- Build teacher AI literacy as a side-effect of normal use.

### Non-goals (v0)

- ❌ No pupil-facing output from this feature (generated worksheets for pupils are a separate v1 feature).
- ❌ No multi-lesson scheme of work generation (single-lesson only in v0).
- ❌ No curriculum-mapping to specific commercial schemes (Twinkl, White Rose). Only to the National Curriculum for England, KS1–2.
- ❌ No integration with school MIS systems (Arbor, SIMS). Out of scope for v0.
- ❌ No voice input.

## 3. User journey

### Happy path

1. Teacher signs in (existing auth flow; out of scope for this spec).
2. Teacher navigates to `/planner/new`.
3. Teacher fills in a compact form:
   - Year group (Y3 / Y4 / Y5 / Y6)
   - Subject (Maths / English / Science / Foundation subject selector)
   - Learning objective (free text, validated ≥ 10 chars and ≤ 300 chars)
   - Lesson length (30 / 45 / 60 minutes; default 45)
   - Class context tags (multi-select from fixed list: "mixed attainment", "majority EAL", "includes SEND", "high prior attainment", "recovering from absence", "low prior attainment in this strand")
4. Teacher clicks *Generate plan*.
5. UI streams the plan in sections with rationale panels appearing alongside each section as it arrives.
6. Teacher reviews. For each section they can:
   - **Accept** (default) — no action needed
   - **Revise** — inline edit; revision is tracked
   - **Reject** — section is blanked; teacher can regenerate with modified prompt or write manually
7. Teacher can click *Regenerate section* on any rejected or unsatisfactory section, optionally with a short instruction ("make this more visual", "add retrieval practice from last week").
8. Teacher exports (PDF / DOCX / copy).

### Error and edge paths

- Model timeout or error: user sees a retry button and the partial plan is preserved.
- Model returns content flagged by safeguarding input scanner: teacher is shown a neutral message and redirected to the school's DSL process. No content reaches the model.
- Teacher's input contains safeguarding keywords: same flow.
- Rate limit exceeded: user sees their quota status and a clear timestamp for reset.
- Offline: form submission queued; user notified.

## 4. Acceptance criteria

A feature is not shipped until every criterion below passes.

### Functional
- [ ] Form validates all fields; submit is disabled until valid.
- [ ] Generated plan contains at least: starter, main activity, independent practice, plenary, assessment-for-learning opportunity, SEND adaptation note, challenge extension.
- [ ] Every section has a rationale panel visible by default.
- [ ] Every section is editable inline.
- [ ] Export to PDF and DOCX works without layout regression.
- [ ] Regenerate-section works without losing unrelated sections.

### Pedagogical
- [ ] Rationale cites a named pedagogical principle (Rosenshine, spacing, retrieval, cognitive load, etc.) where relevant.
- [ ] Plan references the correct National Curriculum programme of study strand for the given year group and subject.
- [ ] No drift outside the stated curriculum objective.
- [ ] "Show-working" panel cannot be globally disabled; only compressible per-section.

### Principle compliance
- [ ] Principle 2: every generated item is editable; every item has rationale — **automated test**.
- [ ] Principle 3: show-working is the default state for new users — **automated test**.
- [ ] Principle 4: one CPD micro-prompt surfaces per session — **automated test**.
- [ ] Principle 5: all required telemetry events fire — **automated test on the event log**.

### Non-functional
- [ ] First meaningful content streams within 3 seconds of submit on a 4G connection.
- [ ] Full plan completes within 30 seconds on 95th percentile.
- [ ] WCAG 2.2 AA passes for all new UI — **axe-core test in CI**.
- [ ] Keyboard navigation covers every interaction.
- [ ] No pupil PII stored. No model training on customer data (verified by processor agreement on file).

## 5. Data model — Supabase schema

### Migration: `0001_planner_tables.sql`

```sql
-- Schools (assumed to exist from auth module; included here as FK target)
-- create table if not exists schools (
--   id uuid primary key default gen_random_uuid(),
--   name text not null,
--   urn text unique,
--   created_at timestamptz not null default now()
-- );

-- A lesson plan owned by one teacher at one school
create table plans (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  year_group text not null check (year_group in ('Y3','Y4','Y5','Y6')),
  subject text not null,
  learning_objective text not null check (char_length(learning_objective) between 10 and 300),
  lesson_length_minutes int not null check (lesson_length_minutes in (30,45,60)),
  class_context_tags text[] not null default '{}',
  prompt_version text not null,
  model_id text not null,
  status text not null default 'generating' check (status in ('generating','ready','failed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  exported_at timestamptz,
  archived_at timestamptz
);

-- Each section of a plan (starter, main, plenary, etc.) stored separately so
-- we can track per-section edit and regeneration activity.
create table plan_sections (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans(id) on delete cascade,
  section_key text not null,
  section_order int not null,
  content_md text not null,
  rationale_md text not null,
  rationale_principles text[] not null default '{}',
  state text not null default 'accepted' check (state in ('accepted','revised','rejected')),
  last_edited_at timestamptz,
  regenerated_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (plan_id, section_key)
);

-- Telemetry events — append-only
create table planner_events (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references plans(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  school_id uuid not null references schools(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Safeguarding interception log — records input attempts, never content
create table safeguarding_intercepts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  school_id uuid not null references schools(id) on delete cascade,
  matched_category text not null,
  created_at timestamptz not null default now()
);

create index plans_school_user_idx on plans (school_id, user_id, created_at desc);
create index plans_status_idx on plans (status) where status = 'generating';
create index sections_plan_idx on plan_sections (plan_id, section_order);
create index events_plan_idx on planner_events (plan_id, created_at);
create index events_school_type_idx on planner_events (school_id, event_type, created_at);
```

### Migration: `0002_planner_rls.sql`

```sql
alter table plans enable row level security;
alter table plan_sections enable row level security;
alter table planner_events enable row level security;
alter table safeguarding_intercepts enable row level security;

-- Teachers can see their own plans. School leaders (role = 'leader')
-- can see all plans at their school. No cross-school access, ever.
create policy plans_select_own
  on plans for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from memberships m
      where m.user_id = auth.uid()
        and m.school_id = plans.school_id
        and m.role = 'leader'
    )
  );

create policy plans_insert_own
  on plans for insert
  with check (user_id = auth.uid());

create policy plans_update_own
  on plans for update
  using (user_id = auth.uid());

-- Analogous policies for plan_sections, planner_events, safeguarding_intercepts.
-- Full policy set included in the migration; truncated here for brevity.
```

### Supabase Storage

One bucket: `plan-exports` (private). Objects keyed by `{school_id}/{plan_id}.{pdf|docx}`. RLS mirrors `plans` table.

## 6. API surface

### Server Action: `generatePlan(input: PlanInput): Promise<{ planId: string }>`

Located in `app/(teacher)/planner/actions.ts`.

- Validates `input` with Zod.
- Runs safeguarding input scanner. If matched, logs to `safeguarding_intercepts`, returns `{ error: 'safeguarding_redirect' }`.
- Creates `plans` row with `status = 'generating'`.
- Kicks off background generation via a Route Handler (below) — does not block.
- Returns `planId` so the UI can subscribe to the streaming endpoint.

### Route Handler: `POST /api/planner/generate/[planId]`

Streams via Server-Sent Events. Each event is a JSON payload:

```ts
type StreamEvent =
  | { type: 'section_start'; section_key: SectionKey; section_order: number }
  | { type: 'section_content_delta'; section_key: SectionKey; delta: string }
  | { type: 'section_rationale_delta'; section_key: SectionKey; delta: string }
  | { type: 'section_complete'; section_key: SectionKey; principles: string[] }
  | { type: 'plan_complete' }
  | { type: 'error'; message: string };
```

Sections are generated in a deterministic order: `starter → main → independent_practice → plenary → afl → send_adaptation → challenge`. Each is a structured call to the model with its own prompt.

### Route Handler: `POST /api/planner/[planId]/section/[sectionKey]/regenerate`

Accepts `{ instruction?: string }`. Regenerates one section while preserving the others. Increments `regenerated_count`.

### Route Handler: `POST /api/planner/[planId]/export`

Accepts `{ format: 'pdf' | 'docx' }`. Renders from `plan_sections` using a server-side template. Writes to Storage bucket; returns a time-limited signed URL.

## 7. Component hierarchy

```
app/(teacher)/planner/
├── new/
│   └── page.tsx                    — PlannerFormPage (server component)
├── [planId]/
│   ├── page.tsx                    — PlannerViewPage (server component, hydrates sections)
│   └── stream-client.tsx           — 'use client' SSE subscriber, wraps PlanView
└── actions.ts                      — Server Actions

components/planner/
├── PlannerForm.tsx                 — 'use client' form
├── PlanView.tsx                    — Accepts streamed + hydrated sections
├── SectionCard.tsx                 — Content + RationalePanel + state controls
├── RationalePanel.tsx              — Renders rationale + cited principles; collapsible per-section
├── SectionEditor.tsx               — Inline markdown editor
├── RegenerateDialog.tsx            — Captures optional instruction
└── ExportDialog.tsx                — Format picker + download

components/cpd/
└── MicroPromptBanner.tsx           — One-per-session CPD nudge (principle 4)
```

`RationalePanel` is the principle-3 anchor: it is rendered *open by default* and compresses (not hides) when the teacher collapses it.

## 8. Prompt architecture

This is the critical part of the build. The prompt is what turns a generic lesson planner into a show-working lesson planner.

### Versioning

Every prompt template has a version string stored with each plan. Format: `planner.v{major}.{minor}` (e.g. `planner.v1.0`). Changing the prompt's semantic behaviour bumps the major version and requires an evaluation run against the regression set before shipping.

### Structure

The prompt has four parts, assembled server-side:

1. **System prompt** — role, tone, UK English, non-negotiable constraints (no pupil-facing output, no direct answers, curriculum grounded).
2. **Pedagogical prior** — a fixed block summarising evidence-informed principles the planner is expected to draw on (retrieval practice, spacing, worked examples, modelling, AfL, cognitive load). Stored in `lib/ai/prompts/pedagogy-prior.md` and included verbatim.
3. **Task frame** — the teacher's input, formatted as structured fields.
4. **Output contract** — the exact structure of the response: each section as a pair of `content` and `rationale` blocks, with `rationale` required to cite at least one named principle where applicable. JSON output enforced via structured outputs.

### System prompt (verbatim draft)

```
You are a planning partner for a UK Key Stage 2 teacher. You help them build
a single-lesson plan that is curriculum-grounded, evidence-informed, and
practical for a real classroom.

Three rules that override everything else:

1. Use UK English and UK primary school terminology throughout. National
   Curriculum for England is the only curriculum reference. Year 3–6 only.

2. Every pedagogical choice you make must be accompanied by a rationale
   that names the principle it draws on (retrieval practice, spacing,
   worked examples, cognitive load, modelling, formative assessment, etc.)
   or is honest that it is a practical judgement rather than a
   research-backed choice. Never invent research.

3. You are talking to a teacher, not a pupil. Write at professional
   register. Do not oversimplify. The teacher will decide what to
   do with pupils.

Your output will be rendered section-by-section with the rationale shown
alongside the content. A teacher will be able to accept, revise, or
reject any section. Write as if the teacher will scrutinise every line
— because they will.

Do not produce worksheets, pupil-facing materials, marking schemes, or
assessment grids in this tool. Those are separate features.

If the teacher's input contains any safeguarding-related content
(disclosure, abuse, self-harm, etc.), stop and return the single string
"SAFEGUARDING_REDIRECT". Do not attempt to help with this in any way.
```

### Output contract

```ts
type SectionKey =
  | 'starter'
  | 'main'
  | 'independent_practice'
  | 'plenary'
  | 'afl'
  | 'send_adaptation'
  | 'challenge';

type GeneratedSection = {
  section_key: SectionKey;
  content_md: string;          // Markdown; will be rendered in teacher view
  rationale_md: string;        // Markdown; shown in rationale panel
  principles: string[];        // ['retrieval_practice', 'spacing', 'rosenshine_4'] etc.
  confidence: 'high' | 'medium' | 'low';  // surfaced to teacher
};
```

### Model selection

- **Provider**: Anthropic (Claude), enterprise account.
- **Default model**: the mid-tier Claude Sonnet model (e.g. `claude-sonnet-4-6` at time of writing — keep the model ID in config, not hard-coded).
- **Fallback**: on provider error, retry once with the same model; on second failure, fall back to the next smaller tier.
- **Budget**: each plan generation targets ≤ 20k input tokens, ≤ 8k output tokens. Over-budget runs abort with clear user messaging.

## 9. Telemetry events

All events logged to `planner_events`.

| event_type | Payload | Fires when |
|---|---|---|
| `planner_form_opened` | `{}` | User opens `/planner/new` |
| `planner_submitted` | `{ year_group, subject, tags, obj_length }` | Form submit |
| `planner_safeguarding_intercept` | `{ matched_category }` | Input scanner fires |
| `section_generated` | `{ section_key, tokens_in, tokens_out, duration_ms }` | One section completes |
| `plan_ready` | `{ total_duration_ms, total_tokens }` | All sections complete |
| `section_accepted` | `{ section_key }` | User explicitly accepts (default on export if no action) |
| `section_revised` | `{ section_key, edit_distance }` | User inline-edits |
| `section_rejected` | `{ section_key }` | User rejects |
| `section_regenerated` | `{ section_key, had_instruction }` | Regenerate dialog submit |
| `plan_exported` | `{ format, elapsed_since_ready_ms }` | Export completes |
| `cpd_prompt_shown` | `{ prompt_id }` | Micro-prompt appears |
| `cpd_prompt_engaged` | `{ prompt_id, action }` | Teacher interacts |

Aggregates derived from these events:
- **Time-to-plan** = `plan_exported.created_at − planner_submitted.created_at`
- **Edit rate** = revised sections / total sections
- **Export-without-edit rate** = plans exported with zero `section_revised` events
- **Regeneration rate** per section

## 10. Testing strategy

### Unit
- Zod schemas for every API boundary.
- Safeguarding input scanner against a fixed keyword list (deliberately conservative).
- Export renderers for PDF and DOCX.

### Integration
- Happy-path generation with a recorded model response fixture (so CI does not call the live model).
- Regeneration of a single section preserves others.
- RLS: a teacher at school A cannot read plans at school B. Covered by a dedicated test that assumes two seeded schools.

### End-to-end (Playwright)
- Full teacher journey: form → generate (mocked) → accept → export PDF. Accessibility audit with axe at each step.
- Keyboard-only traversal of the form and plan view.

### Evaluation set (separate from CI)
- 30 seed inputs (diverse year groups, subjects, objectives, tags) run against each new prompt version. Outputs reviewed by a human against a rubric (curriculum accuracy, rationale quality, UK English, tone). Results stored in `docs/evals/planner/{version}.md`.

## 11. Implementation order

Small, shippable steps. Each step should leave `main` in a working state.

1. **DB migrations** — tables, RLS, indexes. No UI yet. Verify with SQL.
2. **Server action stub** — accepts input, validates, creates `plans` row with fixed placeholder content. No model call. Proves the plumbing.
3. **Safeguarding input scanner** — unit tested in isolation; wired into server action.
4. **Real model call, non-streaming** — returns finished plan sections in one shot. Writes to `plan_sections`.
5. **Streaming** — replace with SSE Route Handler. UI displays partial content.
6. **Rationale panel and section states** — `SectionCard` with accept/revise/reject; `RationalePanel` with principle chips.
7. **Regenerate single section** — new endpoint + `RegenerateDialog`.
8. **Export to PDF and DOCX** — server-side rendering; Storage bucket; signed URLs.
9. **Telemetry wiring** — fire all events; verify with a smoke-test dashboard query.
10. **CPD micro-prompt banner** — lightweight component; reads from a seeded list of prompts.
11. **E2E tests and evaluation run** — lock v1.0 of the prompt; write evaluation report.
12. **Launch to a small alpha** (3–5 teachers) — gather qualitative feedback for two weeks before wider release.

## 12. Open questions

These should be resolved before step 4 (real model call):

- [ ] Confirm enterprise contract terms with Anthropic — specifically data residency, no-training clause, and retention.
- [ ] Decide the list of named pedagogical principles we cite. First pass: Rosenshine (10 principles), retrieval practice, spacing, cognitive load theory, dual coding, modelling, formative assessment. Close this list early — we cite consistent language across plans.
- [ ] Agree the safeguarding keyword list with a primary-school DSL. Conservative by default; false positives here are better than false negatives.
- [ ] Confirm the curriculum source: National Curriculum for England programmes of study (statutory) at KS1 and KS2, current version.

## 13. Definition of done

This feature is done when:

- All acceptance criteria in §4 pass in CI and in a manual spot check.
- One primary teacher independent of the build team completes a full journey without assistance and reports the output usable in their classroom the next day.
- The evaluation set has been run against the shipped prompt version and results are stored in `docs/evals/planner/v1.0.md`.
- The telemetry dashboard shows all 12 event types firing with non-trivial data from real usage.
- The DPIA in `../strategy/04-dpia-template.md` has been re-read and no new risks have emerged that are not already covered.
