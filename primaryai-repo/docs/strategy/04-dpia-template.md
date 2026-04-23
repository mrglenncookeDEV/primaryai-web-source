# 04 — Data Protection Impact Assessment template (PrimaryAI)

> Status: working draft v1.0 — 22 April 2026
> This DPIA template is pre-populated with PrimaryAI's intended data flows and risk profile. It is designed to be customised by each subscribing school's Data Protection Officer. It follows ICO guidance for DPIAs under Article 35 UK GDPR and incorporates the DfE's Generative AI product safety expectations (June 2025).
>
> Sections marked `[to complete]` are filled in by the school; the remainder reflects PrimaryAI's product-side commitments and may be used as supplied.

## Document control

| Field | Value |
|---|---|
| Document title | Data Protection Impact Assessment — PrimaryAI |
| Version | Draft v1.0 |
| Prepared by | `[School DPO — to complete]` |
| Date | `[to complete]` |
| Review date | Annually, or on material change to processing |
| Approver | `[Headteacher / Governing Body]` |

## Step 1 — Identify the need for a DPIA

A DPIA is required where processing is likely to result in a high risk to the rights and freedoms of individuals. Processing pupil-adjacent data using a generative AI system meets this threshold.

| Question | Assessment |
|---|---|
| Is the processing new? | Yes — introduction of PrimaryAI represents a new category of processing using generative AI models on pupil and staff data. |
| Is it likely to result in high risk? | Yes — processing involves data relating to children (a vulnerable category under UK GDPR) and uses automated generative technology. A DPIA is therefore required under Article 35 UK GDPR and aligns with ICO guidance on AI and children. |
| Screening outcome | **Full DPIA required.** |

## Step 2 — Describe the processing

### Nature of the processing

- **Teacher inputs**: lesson planning prompts, curriculum objectives, class profile (year group, subject, broad differentiation needs).
- **Pupil data (aggregated only by default)**: attainment groupings, SEND indicators where teacher-entered, year group. No pupil names are required for core lesson-planning flows.
- **Staff account data**: email, name, role, school affiliation.
- **Generated outputs**: lesson plans, worksheets, assessment materials, marking drafts, teacher CPD prompts.
- **Telemetry**: time-on-task, feature usage, export and edit rates — for product improvement and school evidence reporting.

### Scope of the processing

- **Volume**: dependent on school size; designed for class-level (~30 pupils) and school-level (up to ~500 pupils) use.
- **Variety**: structured (curriculum codes, year groups) and unstructured (free-text teacher prompts, generated content).
- **Sensitivity**: SEND indicators and safeguarding context treated as special-category-adjacent and handled under enhanced safeguards. No health, biometric, or protected-characteristic data is required for core features.
- **Retention**: teacher inputs and outputs retained for the duration of the school's subscription plus 30 days, unless the school configures a shorter retention period.
- **Geography**: data processed in UK/EU regions only. No transfers to jurisdictions without an adequacy decision.

### Context of the processing

- **Data subjects**: primarily teachers and school staff; indirectly pupils via aggregated class data.
- **Relationship**: controller (school) — processor (PrimaryAI). Contract in place under Article 28 UK GDPR.
- **Reasonable expectations**: staff and parents should be informed via the school's privacy notice and AI-use policy. A template transparency notice is provided with PrimaryAI.
- **Public concern level**: elevated — AI in schools is a live public debate; transparency is a trust requirement, not just a legal one.

### Purpose of the processing

- **Primary purpose**: reduce teacher workload on planning, resource creation and marking, in order to free time for direct instruction.
- **Secondary purpose**: develop teacher and pupil AI literacy and critical thinking through designed-in scaffolding.
- **Lawful basis**: public task under Article 6(1)(e) UK GDPR for the school as controller, in support of its statutory educational function.

## Step 3 — Consultation

The school should document consultation with the following groups before deployment. PrimaryAI provides template communications and consultation scripts for each.

- Data subjects (teachers, representatives of parents) — via staff meeting and parent letter.
- Data Protection Officer — formal review of this DPIA and the processor agreement.
- Information security lead — review of access controls and incident response process.
- Designated Safeguarding Lead — review of safeguarding interaction with AI inputs.
- Governing Body — for approval of AI-use policy and budget.

## Step 4 — Assess necessity and proportionality

The processing is necessary to achieve the stated purpose (workload reduction and critical-thinking development) and proportionate because:

- **Data minimisation** is applied — core flows use class-level aggregates, not individual pupil data.
- **Purpose limitation** is enforced — data is not used for training the underlying model or for any secondary purpose beyond the contracted service.
- **Teacher and leader controls** exist — individuals can opt out of telemetry; schools can configure retention; audit logs provide transparency.
- **Alternatives considered** — general-purpose AI tools (ChatGPT, Gemini) were considered but rejected because they lack the governance, transparency and pedagogical guardrails required in a primary-school context.

## Step 5 — Identify and mitigate risks

Likelihood and severity are PrimaryAI's initial assessment. Schools should review in context. Mitigations listed are implemented in product; additional school-level mitigations may apply.

| Identified risk | Likelihood | Severity | Mitigation in product |
|---|---|---|---|
| Hallucinated content presented to pupils | Medium | High | Hallucination flag on teacher outputs; pupil-facing generation runs through factual constraint layer and citation requirement |
| Bias in generated content (cultural, gender, SEND) | Medium | Medium | Bias-and-representation audit feature; red-team test set run pre-release; teacher review required before any pupil use |
| Pupil over-reliance on AI (cognitive offloading) | High | High | Socratic-by-default pupil UI; forced articulation; intervention dashboard flags heavy-use year groups to the AI safety lead |
| Unauthorised processing of pupil personal data | Low | High | Core lesson-planning flows do not require pupil names; pupil-level data only processed where teacher explicitly opts in; UK/EU-only processing |
| Safeguarding disclosure accidentally sent to AI | Low | High | Input scanner detects safeguarding keywords and prompts teacher to use the school's designated safeguarding process instead; content not sent to model |
| Staff over-reliance and de-skilling | Medium | Medium | Show-working default; teacher CPD micro-prompts; export-without-edit rate surfaced in leadership dashboard |
| Lack of transparency with parents | Medium | Medium | Template transparency notice shipped with product; school-branded parent communication generator |
| Data breach via third-party model provider | Low | High | Enterprise-grade model contracts (no training on customer data); data residency controls; Article 28 processor agreements in place |
| Misuse by pupils to generate inappropriate content | Medium | Medium | Age-appropriate content filters; rate limiting; classroom-mode teacher visibility into all pupil interactions |
| Environmental cost of heavy AI use | High | Low | Caching and prompt efficiency; usage dashboard shows compute cost; teacher nudges toward non-AI alternatives where appropriate |

## Step 6 — Sign-off and outcomes

After review, the DPO should record the residual risk level and whether the processing can proceed. Where residual high risk remains, consultation with the ICO is required before processing begins.

| Field | Value |
|---|---|
| Residual risk level | `[Low / Medium / High — to complete]` |
| Measures approved by DPO | `[to complete]` |
| Residual risks accepted by headteacher | `[to complete]` |
| ICO consultation required | `[Yes / No — to complete]` |
| Signed (DPO) | `[Name, signature, date]` |
| Signed (Headteacher) | `[Name, signature, date]` |

## Appendix A — Key references

- UK GDPR Article 35 (DPIA requirement) and Article 28 (processor obligations)
- ICO: Guide to Data Protection Impact Assessments
- ICO: Guidance on AI and data protection; ICO Children's Code
- DfE: *Generative artificial intelligence in education* (policy paper, updated 10 June 2025)
- DfE: *Generative AI product safety expectations* (June 2025)
- DfE: *Using AI in education settings — support materials* (June 2025)
- Keeping Children Safe in Education — latest version, with AI-related safeguarding updates

## Appendix B — Review triggers

This DPIA should be reviewed when any of the following occur:

- A new feature is added to PrimaryAI that changes the nature or scope of processing
- The underlying model provider or processing region changes
- A data breach or near-miss incident occurs
- A material change in UK data protection law, DfE guidance, or ICO guidance
- On annual review, in any case
