# PrimaryAI — Architecture Overview

> **Stack**: Next.js 15 · React 19 · Supabase · Stripe · Google Cloud Run
> **Domain**: https://primaryai.org.uk
> **Repo**: https://github.com/Onepoint-Software/primaryai-web-source

---

## High-Level Architecture

```mermaid
graph TB
    subgraph Client["Browser / Client"]
        UI[Next.js App Router\nReact 19 Pages & Components]
    end

    subgraph Infra["Google Cloud Platform"]
        CB[Cloud Build\nCI/CD Pipeline]
        CR[Cloud Run\nDocker Container\nNode 20 Alpine]
        CB -->|build & deploy| CR
    end

    subgraph NextJS["Next.js 15 App — Cloud Run"]
        MW[middleware.ts\nAuth Guard]
        Pages[App Router Pages]
        API[API Routes\n/api/**]
        Engine[AI Engine\nsrc/engine/]
        Exporters[Exporters\nPDF · PPTX · Excel]
    end

    subgraph Data["Data Layer"]
        SB[(Supabase\nPostgreSQL)]
        ST[Supabase Storage\nlibrary-docs bucket]
        PR[(Prisma\nSQLite — dev only)]
    end

    subgraph AIProviders["AI Providers — Multi-Provider Ensemble"]
        C[Cerebras]
        G[Groq]
        GM[Gemini]
        MS[Mistral]
        OR[OpenRouter]
        CO[Cohere]
        CF[Cloudflare Workers]
        HF[HuggingFace]
    end

    subgraph External["External Services"]
        Stripe[Stripe\nSubscriptions & Webhooks]
        Resend[Resend\nEmail]
        GCal[Google Calendar\nOAuth + API]
        OCal[Outlook Calendar\nMicrosoft OAuth + API]
        BH[UK Bank Holidays\nGov.uk API]
    end

    UI -->|HTTPS| CR
    CR --> MW
    MW --> Pages
    MW --> API
    Pages --> API
    API --> Engine
    API --> SB
    API --> ST
    API --> PR
    Engine --> AIProviders
    API --> Exporters
    API --> Stripe
    API --> Resend
    API --> GCal
    API --> OCal
    API --> BH
```

---

## Request Lifecycle

```mermaid
sequenceDiagram
    participant B as Browser
    participant MW as middleware.ts
    participant P as Page / API Route
    participant SB as Supabase
    participant AI as AI Engine

    B->>MW: Request (with cookies)
    MW->>MW: Check pa_session OR sb-auth-token cookie
    alt Not authenticated
        MW-->>B: Redirect → /login?next=...
    else Authenticated
        MW->>P: Pass request
        P->>SB: getUser() validation
        P->>AI: callEngine() / callScheduleAI()
        AI-->>P: Generated content
        P-->>B: JSON / SSE stream / HTML
    end
```

---

## Application Routes

### Protected Routes (`/app` group — requires auth)

| Route | Description |
|-------|-------------|
| `/dashboard` | Main teacher dashboard with scheduler, task list, AI panel |
| `/lesson-pack` | AI lesson pack generator |
| `/library` | Document library — folders, lesson packs, uploads |
| `/ai-planner` | Dedicated AI schedule planner (4 AI tools) |
| `/settings` | Term dates, calendar sync, preferences |
| `/account` | User profile |
| `/billing` | Stripe subscription management |
| `/profile-setup` | Onboarding profile wizard |
| `/survey-responses` | View survey data |

### Public Routes (`/public` group)

| Route | Description |
|-------|-------------|
| `/` | Marketing landing page |
| `/login` `/signup` | Auth forms |
| `/forgot-password` `/reset-password` | Password recovery |
| `/pricing` `/features` `/faq` `/contact` | Marketing pages |
| `/legal/privacy` `/legal/terms` | Legal pages |
| `/survey` | Public survey form |

### Other Routes

| Route | Description |
|-------|-------------|
| `/widget/countdown` | Embeddable countdown timer |
| `/preview/*` | Design/Figma previews (dev) |

---

## API Surface

### Auth (`/api/auth/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Email/password login |
| POST | `/api/auth/logout` | Logout (clears cookies) |
| POST | `/api/auth/forgot-password` | Initiate password reset |
| POST | `/api/auth/reset-password` | Confirm password reset |
| GET | `/api/auth/session` | Get current session |
| GET/POST | `/api/auth/google` | Google OAuth |
| GET | `/api/auth/google/callback` | Google OAuth callback |

### Schedule & Calendar

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET/POST | `/api/schedule` | List / create schedule events |
| GET/PUT/DELETE | `/api/schedule/[id]` | Single event CRUD |
| POST | `/api/schedule/[id]/generate-pack` | Generate lesson pack from event |
| GET | `/api/schedule/ai-summary` | AI weekly summary |
| POST | `/api/schedule/ai-plan` | AI schedule planner |
| GET | `/api/schedule/ai-gaps` | AI curriculum gap check |
| POST | `/api/schedule/ai-term-plan` | AI full-term plan generator |
| GET | `/api/calendar/bank-holidays` | UK bank holidays |
| GET | `/api/calendar/ics/[token]` | ICS calendar export |

### Google Calendar Sync

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/schedule/google-connect` | Initiate OAuth |
| GET | `/api/schedule/google-callback` | OAuth callback |
| POST | `/api/schedule/google-import` | Import events |
| POST | `/api/schedule/google-backfill` | Backfill history |
| GET | `/api/schedule/google-status` | Sync status |
| POST | `/api/schedule/google-disconnect` | Revoke access |

### Outlook Calendar Sync

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/schedule/outlook-connect` | Initiate OAuth |
| GET | `/api/schedule/outlook-callback` | OAuth callback |
| POST | `/api/schedule/outlook-import` | Import events |
| POST | `/api/schedule/outlook-backfill` | Backfill history |
| GET | `/api/schedule/outlook-status` | Sync status |
| POST | `/api/schedule/outlook-disconnect` | Revoke access |

### Lesson Packs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/lesson-pack` | Generate lesson pack |
| POST | `/api/lesson-pack/stream` | Stream generation (SSE) |
| POST | `/api/lesson-pack/parse-context` | Parse uploaded documents |
| POST | `/api/lesson-pack/export` | Export as PDF / PPTX / worksheet |
| GET | `/api/lesson-pack/providers` | List available AI providers |

### Library

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET/POST | `/api/library` | List / create lesson packs |
| GET/PUT/DELETE | `/api/library/[id]` | Single lesson pack |
| GET/POST | `/api/library/folders` | Folder CRUD |
| GET/PUT/DELETE | `/api/library/folders/[id]` | Single folder |
| GET/POST | `/api/library/documents` | Document list / upload |
| GET/PUT/DELETE | `/api/library/documents/[id]` | Single document (download/move/delete) |

### Billing

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/checkout` | Create Stripe checkout session |
| GET | `/api/billing/portal` | Stripe billing portal link |
| GET | `/api/subscriptions/status` | Check subscription |
| POST | `/api/stripe/webhook` | Handle Stripe events |

---

## AI Engine

```mermaid
graph TD
    Req[API Request\nLesson Pack / Schedule AI] --> Router

    subgraph Engine["src/engine/"]
        Router[router.ts\nselectProviders\nrate-limit cooldown]
        Orch[orchestrate.ts\nEnsemble + Quality Passes]
        SchedAI[schedule-ai.ts\n8s per-provider\n20s overall deadline]
        Schema[schema.ts\nJSON schema validation]
        Curr[curriculum.ts\nUK curriculum context]
        Vec[vectorSearch.ts\nRAG retrieval]
    end

    subgraph Providers["providers/"]
        P1[Cerebras]
        P2[Groq]
        P3[Gemini]
        P4[Mistral]
        P5[OpenRouter]
        P6[Cohere]
        P7[Cloudflare]
        P8[HuggingFace]
    end

    subgraph Export["exporters/"]
        PDF[pdf.ts\npdf-lib]
        PPT[slides.ts\npptxgenjs]
        XLS[worksheet.ts\nexceljs]
    end

    Router --> Orch
    Router --> SchedAI
    Orch --> Schema
    Orch --> Curr
    Orch --> Vec
    Router -->|selects available\nproviders| Providers
    Orch --> Export
```

### Provider Selection Logic

- **8 LLM providers** registered; selected in priority order
- Providers with recent rate-limit errors are temporarily excluded (cooldown)
- Lesson pack generation: full ensemble + quality/alignment/finalization passes
- Schedule AI: max 3 providers, **8s per-provider timeout**, **20s overall deadline** — always on-demand, never auto-loaded

---

## Data Model

```mermaid
erDiagram
    users ||--o{ subscriptions : has
    users ||--o{ entitlements : has
    users ||--o{ teacher_profiles : has
    users ||--o{ lesson_packs : owns
    users ||--o{ lesson_schedule : owns
    users ||--o{ library_folders : owns
    users ||--o{ library_documents : owns
    users ||--o{ personal_tasks : owns
    users ||--o{ calendar_sync_tokens : has
    users ||--o{ user_preferences : has

    library_folders ||--o{ lesson_packs : contains
    library_folders ||--o{ library_documents : contains

    lesson_packs ||--o| lesson_schedule : "linked via lesson_pack_id"

    subscriptions }o--|| plans : "references"
    webhook_events }o--|| subscriptions : "triggers"
```

### Key Tables

| Table | Purpose |
|-------|---------|
| `users` | Core user accounts (Supabase auth) |
| `plans` | Subscription plan definitions |
| `subscriptions` | Active user subscriptions |
| `entitlements` | Feature flags per user |
| `webhook_events` | Stripe webhook event log |
| `teacher_profiles` | Teaching context: school, subjects, year groups, ability mix, EAL %, pupil premium %, approach |
| `lesson_packs` | Generated lesson content (JSON), linked to schedule events |
| `lesson_schedule` | Timed schedule events (date, start/end time, subject, year group) |
| `library_folders` | Folder hierarchy for library organisation |
| `library_documents` | Uploaded files (PDF, DOCX, images) — stored in Supabase Storage |
| `personal_tasks` | Teacher's personal to-do items |
| `calendar_sync_tokens` | Google / Outlook OAuth tokens |
| `user_preferences` | UI preferences |
| `curriculum_vectors` | Embedded curriculum content for RAG |
| `term_dates_settings` | School term start/end dates |

---

## Component Architecture

```mermaid
graph TD
    subgraph Layout["App Layout"]
        Root[app/layout.js\nRoot Layout]
        AppGroup["(app) Layout\nAppSidebar + main content"]
    end

    subgraph Sidebar["Navigation"]
        AS[AppSidebar.tsx\nDashboard · Lesson · Library\nAI Planner · Settings · Account]
    end

    subgraph Dashboard["Dashboard Page"]
        DP[dashboard/page.tsx]
        SD[SchedulerDrawer.tsx\n51KB — dynamic import]
        WC[WeekCalendar.tsx\nWeek · Day · Month · Term views]
        AP[AiSchedulePanel.tsx\n4 tabs — all on-demand]
        TC[TermCountdownRing.tsx]
        PT[PackList.tsx]
        CM[CustomEventModal.tsx]
    end

    subgraph Library["Library Page"]
        LP[library/page.tsx\n3-column layout]
        FS[Folder Sidebar]
        IL[Item List\nLesson packs + Documents]
        PV[Preview Panel]
    end

    subgraph Gen["Lesson Generator"]
        LPP[lesson-pack/page.tsx]
        Stream[SSE stream from\n/api/lesson-pack/stream]
    end

    Root --> AppGroup
    AppGroup --> AS
    AppGroup --> DP
    AppGroup --> LP
    AppGroup --> LPP
    DP --> SD
    SD --> WC
    DP --> AP
    DP --> TC
    DP --> PT
```

---

## Authentication Flow

```mermaid
flowchart LR
    A[User visits\nprotected route] --> B{middleware.ts\ncookie check}
    B -->|no valid cookie| C[Redirect\n/login?next=...]
    B -->|cookie present| D[Supabase\ngetUser validate]
    D -->|invalid| C
    D -->|valid| E[Allow request]
    E --> F{Entitlements\ncheck}
    F -->|no paid plan| G[Redirect /billing\ncurrently disabled]
    F -->|has access| H[Render page]

    I[Login form] --> J[POST /api/auth/login]
    J --> K[Supabase\nsignInWithPassword]
    K --> L[Set auth cookies]
    L --> M[Redirect to /dashboard]
```

**Cookie names:**
- `pa_session` — legacy JSON session cookie
- `sb-[project]-auth-token` — Supabase JWT (current)

---

## Calendar Sync Architecture

```mermaid
graph LR
    subgraph Google["Google Calendar"]
        GA[OAuth 2.0\nAuthorization]
        GI[Event Import\ngoogle-import]
        GS[Sync State\ngoogle_calendar_sync table]
    end

    subgraph Outlook["Outlook / Microsoft"]
        OA[MSAL OAuth\nAuthorization]
        OI[Event Import\noutlook-import]
        OS[Sync State\noutlook_calendar_sync table]
    end

    subgraph App["App Scheduler"]
        LE[lesson_schedule table\nevent_category:\noutlook_import | google_import]
        WC2[WeekCalendar.tsx\nImported events shown\nwith provider icon\nnon-draggable]
    end

    Google --> GS
    Outlook --> OS
    GS --> LE
    OS --> LE
    LE --> WC2
```

Imported events display with:
- **Outlook icon** (blue) for `event_category = "outlook_import"`
- **Google icon** (red) for `event_category = "google_import"`
- Non-draggable (locked to imported position)

---

## Deployment Pipeline

```mermaid
flowchart LR
    Dev[Developer\ngit push main] --> GH[GitHub\nonepoint-software/primaryai-web-source]
    GH --> CB[Cloud Build\ncloudbuild.yaml]
    CB --> Docker[Docker Build\nNode 20 Alpine\nmulti-stage]
    Docker --> GCR[Google Container\nRegistry / Artifact Registry]
    GCR --> CR2[Cloud Run\nprimaryai-web-source\neurope-west1]
    CR2 --> DNS[primaryai.org.uk\nDNS → Cloud Run]
```

**Cloud Run config:**
- Region: `europe-west1`
- GCP Project: `primary-ai-saas`
- Service: `primaryai-web-source`
- Port: `8080`

**Env vars** are set on Cloud Run (not in git). To update without a code change:
```bash
gcloud run services update primaryai-web-source \
  --region=europe-west1 \
  --project=primary-ai-saas \
  --update-env-vars="KEY=VALUE"
```

---

## Key Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Public app URL |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key (server-side only) |
| `SUPABASE_DB_URL` | Direct database connection URL |
| `STRIPE_SECRET_KEY` | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRICE_STARTER` | Stripe price ID for Starter plan |
| `CEREBRAS_API_KEY` | Cerebras LLM |
| `GROQ_API_KEY` | Groq LLM |
| `GEMINI_API_KEY` | Google Gemini |
| `MISTRAL_API_KEY` | Mistral |
| `OPENROUTER_API_KEY` | OpenRouter aggregator |
| `COHERE_API_KEY` | Cohere |
| `CLOUDFLARE_*` | Cloudflare Workers AI |
| `HUGGINGFACE_API_KEY` | HuggingFace Inference |
| `GOOGLE_CLIENT_ID/SECRET` | Google Calendar OAuth |
| `MICROSOFT_CLIENT_ID/SECRET` | Outlook Calendar OAuth |
| `RESEND_API_KEY` | Email service |
| `AUTH_SECRET` | NextAuth.js secret |

---

## Technology Stack Summary

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| UI | React 19 |
| Language | TypeScript + JavaScript (mixed) |
| Database (prod) | Supabase (PostgreSQL) |
| Database (dev) | Prisma + SQLite |
| ORM | Prisma 6 |
| Auth | Supabase Auth + NextAuth.js beta |
| Storage | Supabase Storage |
| Billing | Stripe |
| Email | Resend |
| AI Providers | Cerebras, Groq, Gemini, Mistral, OpenRouter, Cohere, Cloudflare Workers, HuggingFace |
| Calendar | Google Calendar API + Microsoft Graph API |
| PDF Export | pdf-lib |
| PPTX Export | pptxgenjs |
| Excel Export | exceljs |
| DOCX Parsing | mammoth |
| Hosting | Google Cloud Run |
| CI/CD | Google Cloud Build |
| Container | Docker (Node 20 Alpine) |
| DNS | primaryai.org.uk |
