# 02 — PrimaryAI product principles

> Status: working draft v1.0 — 22 April 2026
> These six principles are the non-negotiable design constraints for PrimaryAI. Every feature must be defensible against all six.

## Why these principles exist

The commercial case for PrimaryAI is workload reduction. The pedagogical case is critical-thinking development. Those pull in opposite directions. These principles are the resolution: they codify when to lean toward speed and when to lean toward friction, so that individual feature decisions do not silently drift toward the generic "answer machine" that competitors default to.

Principles beat preferences. When a stakeholder requests something that contradicts a principle, the principle wins and the conflict is flagged explicitly.

---

## 1. Friction is a feature for pupils, efficiency is a feature for teachers

**Principle.** The product must know which mode it is in. Pupil-facing surfaces slow down and prompt reasoning; teacher-facing surfaces accelerate and preserve judgement. Cross-contamination between these modes is a design defect.

**Manifestation in product.** At the code level this is a user-context flag that routes through different prompt templates, different UI patterns, and different content guardrails. A pupil should never see a teacher-mode response, and vice versa.

**Test.** If we removed the user-context check from a pupil feature, would the feature still behave like a Socratic tutor, or would it fall back to direct answers? If the latter, the feature is wrongly architected.

---

## 2. Every output is editable, every output is explained

**Principle.** The product never produces a black-box result. Alongside any generated artefact — a lesson plan, a worksheet, a marking comment — the teacher sees the pedagogical rationale, the key choices made, and the plausible alternatives.

**Manifestation in product.** Rationale panels sit alongside outputs by default. The teacher can fold them away but cannot remove them for co-planners or for audit trails. Every generated item is editable at the field level, not just as a replacement block.

**Test.** Can another teacher, reading a generated plan for the first time, understand why each pedagogical choice was made without asking the original teacher? If not, the rationale panel is insufficient.

---

## 3. Default to show-working

**Principle.** Reasoning is not hidden behind a toggle that power users unlock; it is the first thing the teacher or pupil sees. Power users can compress it. Novices see the full chain.

**Manifestation in product.** Default UI renders steps, evidence and citations inline. Power-user mode is an opt-in preference stored per-user, not the default state. New users, unauthenticated demos, and returning users after six months of inactivity all see show-working by default.

**Test.** What does a teacher see on their very first generation? If the answer is "a finished lesson plan with a 'show reasoning' button", the principle is violated.

---

## 4. Teach the tool while using it

**Principle.** Every feature carries a small pedagogical or AI-literacy payload. The teacher leaves every planning session a little more fluent in evidence-informed pedagogy or AI literacy than they started.

**Manifestation in product.** Micro-prompts surface one pedagogical principle or one AI-literacy concept per session, chosen by frequency of teacher exposure, not randomly. These are distinct from the rationale panel: rationale explains *this* plan; micro-prompts build transferable knowledge over time.

**Test.** After a teacher has used PrimaryAI for a full term, can they articulate 5–10 evidence-informed pedagogical principles they have encountered through use? If not, the micro-prompt system is not doing its job.

---

## 5. Instrument for evidence from day one

**Principle.** The product is built to generate the metrics an independent EEF-style evaluation would need: time-to-plan, time-to-mark, teacher-reported quality, export-without-edit rate, and aggregated pupil engagement signals. This serves both product truth and commercial credibility.

**Manifestation in product.** Telemetry schema is designed before the first customer signs. A built-in "export evaluation report" feature produces the metrics in a format schools can share with governors or use in Ofsted preparation. The data model supports future RCT participation without retrofit.

**Test.** If the EEF wrote to us tomorrow asking to run a randomised controlled trial of PrimaryAI in KS2, could we provide the metrics they would need within a week? If not, we are not instrumented.

---

## 6. Compliance is a product, not a document

**Principle.** DPIAs, audit trails, policy templates and transparency notices are features with UX, not PDFs attached to sales decks. Primary schools do not have the legal or technical capacity to generate these from scratch.

**Manifestation in product.** DPIA generator pre-populated with PrimaryAI's own data flows. Exportable audit log per user per term. Template AI-use policy and transparency notice, customisable by school name and DPO. All accessible from the leader dashboard, not buried in help docs.

**Test.** Could a primary-school AI safety lead, with no legal training and 30 minutes of admin time, produce the DPIA, AI-use policy, and parent transparency notice needed to deploy PrimaryAI to their staff? If not, compliance is not yet a product.

---

## How to use these principles

### In feature reviews
Every proposed feature should be evaluated against all six. A feature that violates any principle requires either:
- A redesign that resolves the violation, or
- An explicit exception documented in the feature spec, approved by whoever owns product direction.

Silent violations are the failure mode to avoid.

### In code review
Reviewers should ask: "Which principles does this PR uphold, and is there any principle it weakens?" The latter question is more important than the former.

### In sales conversations
When a school asks "can PrimaryAI do X?", the answer is not always yes. Some things it shouldn't do. These principles are the reason, and articulating them to schools builds trust — particularly with the DfE-aware heads who will be our early adopters.

### In disagreement
If a team member believes a principle is wrong, the right path is to propose a change to this document, not to work around the principle in a specific feature. Principle drift via a thousand small exceptions is how products lose their distinctive stance.
