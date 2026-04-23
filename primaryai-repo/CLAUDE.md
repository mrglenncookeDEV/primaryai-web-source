# PrimaryAI

> SaaS platform automating lesson planning and time management for UK primary school teachers, with designed-in critical-thinking scaffolding. Live at primaryai.org.uk.

## What this is

PrimaryAI helps UK primary teachers (Key Stage 2 focus in v1) plan lessons, create resources, differentiate and mark work — while preserving and actively developing professional judgement. The product's distinctive stance is **scaffolding over substitution**: every AI-assisted flow is designed to teach, not replace. Pupil-facing features, when introduced, use Socratic scaffolding and never give direct answers.

## Tech stack

- **Framework**: Next.js 15 (App Router, React Server Components where appropriate)
- **Database & auth**: Supabase (Postgres with RLS, Auth, Storage)
- **Language**: TypeScript, strict mode
- **Styling**: Tailwind CSS
- **Hosting**: Vercel (UK/EU region)
- **Model provider**: Anthropic (Claude). Enterprise terms — no training on customer data. Processing in EU region only.
- **Observability**: Structured logging; telemetry schema defined before any new feature ships

## Before building anything, read

These docs are the source of truth. If something in code contradicts them, the docs win and the code is wrong.

1. `docs/strategy/01-research-synthesis.md` — why this product exists and what evidence underpins it
2. `docs/strategy/02-product-principles.md` — the six non-negotiable product principles
3. `docs/strategy/03-feature-matrix.md` — the feature roadmap mapped to the OECD AILit framework
4. `docs/strategy/04-dpia-template.md` — data protection constraints and risk register
5. `docs/specs/` — individual feature specs; build top to bottom

## The six non-negotiable principles (short form)

1. **Friction is a feature for pupils, efficiency is a feature for teachers** — the UI must know which mode it is in
2. **Every output is editable, every output is explained** — no black-box generation
3. **Default to show-working** — reasoning is visible by default, not behind a toggle
4. **Teach the tool while using it** — every feature carries a small AI-literacy or pedagogy payload
5. **Instrument for evidence from day one** — time-to-plan, edit-rate, export-without-edit must be measurable
6. **Compliance is a product, not a document** — DPIAs, audit logs, policy templates are features with UX

## Conventions

### Language and locale
- **UK English throughout**: organise, behaviour, prioritise, colour, centre, programme, analyse, etc.
- **Terminology**: pupil (not student), Year 3–6 (not grade levels), teacher (not educator), headteacher (not principal), Key Stage 2 / KS2, SEND (not special needs)
- **Curriculum reference**: National Curriculum for England (Key Stages 1–2)
- **Dates**: dd/mm/yyyy in UI copy; ISO 8601 (`YYYY-MM-DD` or full timestamp) in storage and APIs
- **Currency**: GBP

### Code
- TypeScript strict mode; no `any` without a comment justifying it
- Server Components by default; `'use client'` only where genuinely needed
- Server Actions for mutations; Route Handlers only for external integrations or streaming
- Tailwind classes only; no arbitrary inline styles
- File naming: `kebab-case.ts` for utilities, `PascalCase.tsx` for components
- Supabase RLS enabled on every table; never disable to "make it work"
- All user input validated with Zod at the API boundary

### Accessibility
- WCAG 2.2 AA minimum, non-negotiable — primary schools must be able to deploy this to staff with assistive tech
- Keyboard navigation tested for every interactive feature
- Colour contrast: minimum 4.5:1 for body text, 3:1 for large text and UI components

### Telemetry
- Every AI generation logs: user, timestamp, feature, prompt version, model, token counts, duration, outcome (accepted/revised/rejected), edit distance if revised
- Aggregated, anonymised metrics exposed to school leaders via dashboard
- No pupil PII in telemetry streams

## Don'ts

- ❌ Don't ship **any pupil-facing feature** without explicit approval and a separate review — pupil features are a different risk category
- ❌ Don't build direct-answer AI patterns anywhere; use Socratic scaffolding for learners
- ❌ Don't use browser `localStorage` or `sessionStorage` for anything related to AI interactions — audit trail requirement breaks otherwise
- ❌ Don't store individual pupil personal data in core lesson-planning flows — use class-level aggregates
- ❌ Don't remove the "show working" panel or make it opt-in by default; it is the default state
- ❌ Don't send any safeguarding-flagged content to the model — intercept and redirect to the school's designated safeguarding lead (DSL) process
- ❌ Don't use US English, US curriculum references, or US school terminology anywhere user-visible
- ❌ Don't call the model from the client — always go via a server route with proper auth and logging
- ❌ Don't introduce a new AI provider without updating the DPIA
- ❌ Don't skip RLS on a new Supabase table because "it's internal"

## Current phase

v0 — teacher-facing MVP. Building in order:
1. Show-working lesson planner → see `docs/specs/FEATURE-001-show-working-planner.md`
2. Hallucination flag and source check
3. Differentiation assistant
4. Marking and feedback assistant

No pupil-facing features in v0. No leadership dashboard in v0 (instrumentation goes in from day one; the dashboard is v1).

## When in doubt

Ask before building. When a request seems to conflict with the principles above, flag the conflict explicitly — don't silently work around it. The principles are not suggestions; they are what makes this product defensible to a DfE-aware headteacher.

## Useful commands

```bash
# Dev
pnpm dev

# Type check & lint
pnpm typecheck
pnpm lint

# Test
pnpm test

# Supabase migrations
supabase migration new <name>
supabase db push       # local
supabase db push --linked  # remote

# Regenerate DB types after migration
pnpm db:types
```

## Repo structure (target)

```
app/                          Next.js App Router
  (teacher)/                  Teacher-authenticated routes
  api/                        Route handlers (streaming, webhooks)
components/
  ui/                         Primitive components
  planner/                    Lesson planner feature components
  rationale/                  Show-working panel components
lib/
  ai/                         Model calls, prompt templates, hallucination detection
  supabase/                   Client factories, typed queries
  telemetry/                  Event logging
  validation/                 Zod schemas
supabase/
  migrations/                 SQL migrations
docs/
  strategy/                   Strategy docs (source of truth)
  specs/                      Per-feature build specs
```
