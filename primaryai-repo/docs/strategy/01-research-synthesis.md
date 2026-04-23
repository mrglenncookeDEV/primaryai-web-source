# 01 — Research synthesis and strategic direction

> Status: working draft v1.0 — 22 April 2026
> This document summarises the research base that informs PrimaryAI's product direction.

## 1. The UK regulatory landscape has firmed up

The Department for Education published updated generative AI guidance on 10 June 2025, alongside a collection of support materials and a separate **Generative AI product safety expectations** framework. The DfE defines generative AI as software powered by large language models and is explicit that, while it can help with planning, marking and administration, its use must always include human oversight — with specific caution around hallucination, bias and data handling.

For any schools-facing SaaS, this means three practical things:

- **Transparency obligations** — schools must be open with staff, governors, pupils and parents about how personal data is processed when generative AI is involved.
- **Data Protection Impact Assessments** — schools are expected to conduct DPIAs before deploying any AI tool that processes pupil or staff data. A vendor that ships a pre-populated DPIA removes a significant friction point in procurement.
- **Product safety expectations** — the DfE's standalone framework sets the bar for what counts as a safe AI product in education. Alignment with this framework will increasingly be a procurement requirement, not a nice-to-have.

The direction of travel: by Q4 2026, the expectation is that 100% of schools will have an AI policy and a designated AI safety lead teacher. DPIAs are expected to be conducted for all AI tools before deployment.

## 2. The evidence base for teacher workload reduction

The most important single piece of evidence currently available is the **Education Endowment Foundation's late-2024 randomised controlled trial** of ChatGPT in KS3 science:

- **259 teachers across 68 secondary schools** in England
- Teachers using ChatGPT with a structured user guide: **56.2 minutes/week** on lesson and resource planning
- Non-AI comparison group: **81.5 minutes/week**
- Saving: **25.3 minutes/week** or **31%**
- **No quality difference** detected by an independent blind review panel

A follow-up trial at primary level is now running. The EEF, via NFER, is evaluating Oak National Academy's **Aila** lesson-planning assistant with around 450 Key Stage 2 teachers across 86 primary schools during the autumn 2025 term, with results expected in autumn 2026.

This is the direct benchmark against which PrimaryAI will eventually be compared. Instrumenting PrimaryAI from launch to generate equivalent metrics is therefore both good product practice and a commercial imperative.

## 3. The critical-thinking risk — specific to younger users

The central pedagogical risk in deploying AI with or near pupils is **cognitive offloading**: the tendency to delegate reasoning to a tool rather than perform it oneself.

**Gerlich (2025)**, *Societies* 15(1): 6 — a mixed-methods study with 666 participants — found a statistically significant negative correlation between frequent AI tool usage and critical-thinking scores, with that relationship mediated by cognitive offloading. Critically for a primary-schools product, **the effect was strongest in younger participants**, who showed higher dependence and lower critical-thinking scores than older users.

Two implications for PrimaryAI:

1. Any pupil-facing feature carries this risk directly and must be designed around it.
2. Even teacher-facing features can inadvertently deskill teachers over time, weakening the professional judgement that makes AI outputs usable in the first place. The product therefore has a duty of care toward both audiences.

## 4. The central design tension

The commercial case for PrimaryAI is speed and automation. Workload reduction is what gets schools to purchase.

The pedagogical case, however, points in the opposite direction: productive struggle is what builds teacher expertise and pupil thinking.

These pull against each other if not designed deliberately.

The research literature offers a resolution under the banner of **scaffolding over substitution**. The Socratic AI tutor model promotes critical thinking by prompting learners to articulate reasoning and work through ideas, rather than supplying finished answers. The effect is to shift the learner from asking "what is the answer?" to "why is that the answer, and how do I know?"

Commercial proof points include Khan Academy's Khanmigo, which unfolds problems as hints and reflective pauses. Evidence on Socratic AI is mixed — some studies show no measurable test-outcome improvement over direct-answer AI, and learners sometimes rate Socratic systems as "less helpful" — so the design principle is nuanced: **friction must feel purposeful, not obstructive**.

## 5. Three lenses for PrimaryAI

### Teachers

The EEF's 31% number is a floor, not a ceiling. The more interesting opportunity is to use PrimaryAI as a **continuing professional development vehicle**. Every interaction becomes a micro-CPD moment when the tool:

- Surfaces pedagogical rationale ("retrieval practice here because of spacing research; alternatives are X and Y")
- Critiques the teacher's own prompts and offers upgraded versions
- Flags likely hallucinations before export (dates, statistics, named sources)
- Models the habit of verification as a professional stance

### Pupils

Any pupil-facing feature must be designed around:

- **Withholding answers by default** — this is a product-level decision, not a prompt trick
- **Graduated Socratic intensity** — small hints first, fuller scaffolding only if the pupil is genuinely stuck
- **Surfaced uncertainty** — show confidence levels, distinguish AI's contribution from pupil's
- **Forced articulation** — pupil must rephrase, predict or justify before the tool continues

The failure mode is a chatbot that answers questions. The success mode is a system that makes the pupil do the cognitive work while supplying just enough support to keep them moving.

**Note for build planning**: no pupil-facing features in v0. This lens is documented here to shape the teacher-facing features in ways that are consistent with future pupil features, not to gate pupil development now.

### School management

The under-served opportunity is **governance**. DPIAs, audit logs, AI policy templates, and aggregate workload telemetry are all features that school leaders and AI safety leads actively want, and which competitors (TeachMate, Aila, Century, general-purpose ChatGPT) largely do not ship.

Building these into PrimaryAI converts compliance burden into a product differentiator. By Q4 2026 every school is expected to have an AI policy and safety lead — PrimaryAI should be the easiest path to that compliance.

## 6. Strategic frameworks to align against

Two frameworks provide external validation for PrimaryAI's positioning:

- **OECD / European Commission AI Literacy Framework** (May 2025 review draft, final 2026) — 22 competences across four domains: Engage with AI, Create with AI, Manage AI, Design AI. Feeds into the PISA 2029 Media and AI Literacy assessment.
- **DfE Generative AI product safety expectations** (June 2025) — the procurement bar.

These are the two documents to check every feature against. See `03-feature-matrix.md` for the OECD mapping.

## 7. Next steps

1. Convert this document and the other three strategy docs into the repo under `docs/strategy/`.
2. Commit to a pedagogical positioning anchored on 3–4 OECD competences rather than trying to cover all 22.
3. Instrument v0 features to generate EEF-equivalent metrics from day one.
4. Get on the EEF/NFER research radar for a future trial — a long game, but significant for credibility.
5. Shadow one primary teacher through a full planning cycle with and without AI — the numbers are averages; the *shape* of where time is saved versus where thinking is displaced is what should drive UX decisions.

## Sources

- DfE (2025). *Generative artificial intelligence (AI) in education*. Policy paper updated 10 June 2025.
- DfE (2025). *Generative AI: product safety expectations*. June 2025.
- DfE (2025). *Using AI in education settings: support materials*. June 2025.
- Education Endowment Foundation (2024). *ChatGPT in lesson preparation — Teacher Choices trial*. December 2024.
- Gerlich, M. (2025). AI tools in society: impacts on cognitive offloading and the future of critical thinking. *Societies* 15(1): 6. DOI: 10.3390/soc15010006.
- OECD / European Commission (2025). *Empowering Learners for the Age of AI: An AI Literacy Framework for Primary and Secondary Education* (Review draft, May 2025). https://ailiteracyframework.org
