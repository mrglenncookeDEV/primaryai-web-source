"use client";

import { useState } from "react";
import RadioGroup from "@/components/survey/RadioGroup";
import CheckboxGroup from "@/components/survey/CheckboxGroup";
import RatingScale from "@/components/survey/RatingScale";
import RatingGrid from "@/components/survey/RatingGrid";
import TextArea from "@/components/survey/TextArea";
import QuestionBlock from "@/components/survey/QuestionBlock";
import PartNav from "@/components/survey/PartNav";

const TRUST_SIZE_OPTIONS = ["2-5", "6-10", "11-20", "21-40", "More than 40"];

const TRUST_CHALLENGE_OPTIONS = [
  "Planning quality varies too widely between schools",
  "We have no consistent view of curriculum coverage across the trust",
  "Curriculum and scheme alignment is left entirely to individual schools",
  "Staff retention is affected by workload at multiple schools",
  "Trust policies are not being applied consistently in day-to-day planning",
  "ECTs and new staff receive inconsistent support",
  "We have no visibility of teacher workload patterns",
  "Schools are using AI tools with no trust governance in place",
  "We lack the infrastructure to share best practice efficiently",
  "Other",
];

const PLATFORM_REQUIREMENT_ITEMS = [
  { key: "uk_gdpr_residency", label: "UK GDPR compliance and data residency (UK/EU)" },
  { key: "no_training", label: "No AI training on pupil or staff data" },
  { key: "audit_logs", label: "Full audit logs of AI-generated content" },
  { key: "rbac", label: "Role-based access controls (teacher / leader / admin)" },
  { key: "trust_policy_enforcement", label: "Upload and enforce trust-wide policies and templates" },
  { key: "mis_integration", label: "MIS integration capability (e.g. Arbor, Bromcom, Wonde)" },
  { key: "analytics", label: "Trust-level analytics and workload dashboards" },
  { key: "one_panel_deploy", label: "Deploy across all schools from one admin panel" },
  { key: "pricing_transparency", label: "Cost-per-school or per-seat pricing transparency" },
];

function isBlank(value) {
  return String(value || "").trim().length === 0;
}

export default function PartD({ answers, onChange, onNext, onBack, saving, isFinal, onValidationError }) {
  const [errors, setErrors] = useState({});

  function validate() {
    const nextErrors = {};

    if (isBlank(answers.d_trust_size)) nextErrors.d_trust_size = "Please select one option.";

    if (!Array.isArray(answers.d_trust_challenges) || answers.d_trust_challenges.length === 0) {
      nextErrors.d_trust_challenges = "Select at least one challenge.";
    }

    if (answers.d_trust_challenges?.includes("Other") && isBlank(answers.d_trust_challenges_other)) {
      nextErrors.d_trust_challenges_other = "Please specify the other challenge.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleNext() {
    if (!validate()) {
      onValidationError?.("Please complete the highlighted required fields before continuing.");
      return;
    }
    onNext();
  }

  return (
    <section className="surveyx-card card">
      <h2 className="surveyx-part-title">Part D - System-Wide Consistency & Strategic Oversight</h2>

      <QuestionBlock number={34} label="How many schools are in your trust?" required error={errors.d_trust_size}>
        <RadioGroup
          name="d_trust_size"
          options={TRUST_SIZE_OPTIONS}
          value={answers.d_trust_size}
          onChange={(value) => onChange("d_trust_size", value)}
        />
      </QuestionBlock>

      <QuestionBlock
        number={35}
        label="What are the most significant system-wide challenges your trust faces regarding teaching quality and teacher workload?"
        hint="Select all that apply."
        required
        error={errors.d_trust_challenges || errors.d_trust_challenges_other}
      >
        <CheckboxGroup
          name="d_trust_challenges"
          options={TRUST_CHALLENGE_OPTIONS}
          values={answers.d_trust_challenges || []}
          onChange={(value) => onChange("d_trust_challenges", value)}
          otherOptionValue="Other"
          otherValue={answers.d_trust_challenges_other || ""}
          onOtherChange={(value) => onChange("d_trust_challenges_other", value)}
        />
      </QuestionBlock>

      <QuestionBlock
        number={36}
        label="To what extent does your trust currently have a consistent school-wide approach to lesson planning formats and templates?"
      >
        <RatingScale
          name="d_planning_consistency_rating"
          value={answers.d_planning_consistency_rating}
          onChange={(value) => onChange("d_planning_consistency_rating", value)}
          leftLabel="Every school does its own thing"
          rightLabel="Fully consistent trust-wide approach"
        />
      </QuestionBlock>

      <QuestionBlock
        number={37}
        label="How important are the following when evaluating any EdTech platform for trust-wide adoption?"
      >
        <RatingGrid
          name="d_platform_requirements"
          items={PLATFORM_REQUIREMENT_ITEMS}
          values={answers.d_platform_requirements || {}}
          onChange={(key, value) =>
            onChange("d_platform_requirements", {
              ...(answers.d_platform_requirements || {}),
              [key]: value,
            })
          }
        />
      </QuestionBlock>

      <QuestionBlock
        number={38}
        label="If PrimaryAI could give you a trust-wide view of teacher workload patterns and burnout risk, how valuable would that be?"
      >
        <RatingScale
          name="d_workload_analytics_rating"
          value={answers.d_workload_analytics_rating}
          onChange={(value) => onChange("d_workload_analytics_rating", value)}
          leftLabel="Not valuable to us"
          rightLabel="This is exactly what we need"
        />
      </QuestionBlock>

      <QuestionBlock
        number={39}
        label="What governance or safeguarding requirements would a platform need to meet before your trust would consider adoption?"
      >
        <TextArea
          value={answers.d_governance_requirements || ""}
          onChange={(value) => onChange("d_governance_requirements", value)}
          rows={4}
          placeholder="E.g. DPIA requirements, sub-processor transparency, moderation, DfE alignment..."
        />
      </QuestionBlock>

      <QuestionBlock
        number={40}
        label="In an ideal world, what role should AI play in supporting teachers across your trust, and where should it not be used?"
      >
        <TextArea value={answers.d_ai_role_vision || ""} onChange={(value) => onChange("d_ai_role_vision", value)} rows={5} />
      </QuestionBlock>

      <QuestionBlock
        number={41}
        label="What would success look like for your trust, 12 months after adopting a platform like PrimaryAI?"
      >
        <TextArea value={answers.d_success_definition || ""} onChange={(value) => onChange("d_success_definition", value)} rows={4} />
      </QuestionBlock>

      <QuestionBlock
        number={42}
        label="What is the one question you would want answered before committing your trust to a platform like this?"
      >
        <TextArea value={answers.d_one_question || ""} onChange={(value) => onChange("d_one_question", value)} rows={4} />
      </QuestionBlock>

      <PartNav onBack={onBack} onNext={handleNext} saving={saving} isFinal={isFinal} />
    </section>
  );
}
