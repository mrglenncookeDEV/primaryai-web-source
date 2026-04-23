# 03 — Feature matrix mapped to the OECD AILit framework

> Status: working draft v1.0 — 22 April 2026
> This matrix maps proposed PrimaryAI features to the OECD/EC AI Literacy Framework (review draft, May 2025). The final framework is expected in 2026 with minor revisions.

## The OECD AILit framework (summary)

The framework structures AI literacy around **four domains** comprising **22 competences** across knowledge, skills and attitudes:

| Domain | What it means |
|---|---|
| **Engage with AI** | Recognising AI's presence and evaluating its outputs critically |
| **Create with AI** | Collaborating with AI on creative and problem-solving work, with attention to ownership and attribution |
| **Manage AI** | Deciding when and how to delegate tasks to AI while retaining human judgement |
| **Design AI** | Understanding how AI systems are built and how design choices affect fairness, usefulness and impact |

Full framework: https://ailiteracyframework.org

## Using this matrix

Two practical uses:

1. **In feature reviews** — a proposed feature that does not map cleanly to at least one competence is a candidate for removal or redesign.
2. **In marketing and procurement** — every feature has a named educational rationale grounded in an international framework. This is what competitors focused purely on workload reduction cannot easily replicate.

For the next planning cycle, commit to three or four competences where PrimaryAI will claim genuine excellence, rather than trying to cover all 22. Strong candidates:

- **"Evaluate whether AI outputs should be accepted, revised, or rejected"** — maps directly to teacher professional judgement and pupil critical thinking.
- **"Determine when and how to use AI for a task by assessing its capabilities, risks, and ethical implications"** — core to the leadership and DPO audience.
- **"Computational thinking: decompose problems and provide instructions"** — prompt literacy as a transferable skill.
- **"Collaborate with AI to elicit feedback and refine results"** — the show-working principle in competence form.

## v0 features (teacher-facing, building now)

| Feature | User | OECD domain | Competences | How it builds critical thinking |
|---|---|---|---|---|
| **Show-working lesson planner** | Teacher | Engage; Create | Evaluate AI outputs; Collaborate with AI to elicit feedback and refine | Surfaces pedagogical choices and alternatives; teacher must accept, revise or reject each section |
| **Prompt critique and upgrade** | Teacher | Create | Computational thinking (decompose + instruct); Explore new perspectives that build on original ideas | Teaches prompt construction as a transferable AI-literacy skill; builds fluency through use |
| **Hallucination flag and source check** | Teacher | Engage | Evaluate AI-generated content for accuracy, fairness and bias; Recognise AI's role and influence | Models the habit of verification; normalises doubt of AI output as a professional stance |
| **Curriculum-aligned retrieval practice generator** | Teacher | Create | Collaborate with AI to create and refine original ideas; Analyse authenticity and intellectual property | Forces explicit statement of learning objective before generation; rejects drift from curriculum |
| **Differentiation assistant** | Teacher | Create; Manage | Collaborate iteratively; Delegate structured tasks while retaining judgement | Requires teacher to specify pupil need and review adaptations; maintains human authorship of pedagogy |
| **Marking and feedback assistant** | Teacher | Manage | Determine when and how to use AI; Retain human responsibility for judgement | Pre-draft only; teacher must confirm or rewrite; audit trail shows intervention rate |
| **Teacher CPD micro-prompts** | Teacher | Engage | Recognise AI's role and influence; Connect AI's social and ethical impacts to its capabilities | Distributes AI literacy across the year in small doses rather than a single course |

## v1 features (pupil-facing, gated — do not build yet)

These features are documented here to shape v0 architecture in ways that are forward-compatible. **Do not build these in v0.** Pupil features require a separate design review with DfE guidance compliance sign-off.

| Feature | User | OECD domain | Competences | How it builds critical thinking |
|---|---|---|---|---|
| **Socratic pupil helper (KS2)** | Pupil | Engage; Create | Evaluate AI outputs; Collaborate with AI reflecting on thought processes | Withholds answers by default; graduated hints; forces articulation before continuing |
| **AI spot-the-error game** | Pupil | Engage | Evaluate AI-generated content; Explain how AI could amplify societal biases | Inverts the usual relationship — pupil evaluates AI; AI is the learner being checked |
| **Writing partner with uncertainty** | Pupil | Create | Use AI to explore new perspectives; Analyse authenticity and intellectual property | Surfaces confidence levels; distinguishes pupil's ideas from AI's; attribution visible |

## v0/v1 features (leadership-facing)

| Feature | User | OECD domain | Competences | How it builds critical thinking |
|---|---|---|---|---|
| **DPIA generator and transparency notice** | Leader / DPO | Manage | Determine when and how to use AI; Recognise AI's influence on communities | Forces explicit articulation of data flows, risks and mitigations before deployment |
| **Audit log and intervention dashboard** | Leader | Manage | Retain human responsibility; Explain AI use in ways that promote transparency | Makes AI use auditable; highlights over-reliance by user or year group |
| **School AI-use policy template** | Leader | Manage; Design | Analyse alignment with ethical principles; Ethical AI design (fairness, accountability) | Shifts the school from informal AI use to policy-governed use |
| **Workload evidence export** | Leader | Manage | Determine when and how to use AI; Reflect on AI's broader societal impact | Enables evidence-based decisions about which features continue and which are dropped |
| **Bias and representation audit** | Leader; Teacher | Engage; Design | Explain how AI could amplify biases; Ethical AI design (fairness, transparency) | Surfaces skews in generated content (names, cultural references, examples) for teacher review |

## Build order (v0)

1. **Show-working lesson planner** — the pedagogical flagship; see `../specs/FEATURE-001-show-working-planner.md`
2. **Hallucination flag and source check** — the verification layer; depends on (1)
3. **Differentiation assistant** — extends (1) with class profile awareness
4. **DPIA generator and transparency notice** — the compliance moat; buildable in parallel with (1)–(3)
5. **Telemetry and audit log** — not a user-visible feature in v0, but the foundation for the leadership dashboard in v1
6. **Marking and feedback assistant** — standalone; can ship after (1)–(3)
7. **Teacher CPD micro-prompts** — lightweight cross-feature layer; ships once (1) and (3) are stable

## Principles cross-check

Every feature in the matrix above must also pass the six product principles in `02-product-principles.md`:

1. Friction for pupils, efficiency for teachers
2. Every output editable, every output explained
3. Default to show-working
4. Teach the tool while using it
5. Instrument for evidence from day one
6. Compliance is a product

A feature that maps to an OECD competence but violates a principle fails the review.
