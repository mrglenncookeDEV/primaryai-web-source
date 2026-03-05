"use client";

import { useState } from "react";
import RadioGroup from "@/components/survey/RadioGroup";
import CheckboxGroup from "@/components/survey/CheckboxGroup";
import RatingScale from "@/components/survey/RatingScale";
import RatingGrid from "@/components/survey/RatingGrid";
import TextArea from "@/components/survey/TextArea";
import QuestionBlock from "@/components/survey/QuestionBlock";
import PartNav from "@/components/survey/PartNav";

const ROLE_OPTIONS = [
  "Class Teacher (NQT / ECT)",
  "Experienced Class Teacher (3+ years)",
  "Subject Lead / Curriculum Coordinator",
  "Head Teacher",
  "Deputy Head Teacher",
  "Trust Leader / Director of Education",
  "SENCO",
  "University Tutor / Teacher Educator",
  "Other (free text)",
];

const EXPERIENCE_OPTIONS = ["Less than 2 years", "2-5 years", "6-10 years", "11-20 years", "20+ years"];
const SCHOOL_TYPE_OPTIONS = [
  "Single academy trust",
  "Multi-academy trust (MAT)",
  "Local authority maintained school",
  "Independent / private school",
  "Special school or resource base",
  "Currently not in school",
];

const TEMPLATE_ALIGNMENT_OPTIONS = [
  "Plans from commercial schemes or AI don't align to school or trust templates automatically.",
  "No single clear view of my week, term or year - I have to use a combination of planners to see my week.",
  "Commercial schemes of work aren't mapped to my children's needs or class data.",
];

const CHALLENGE_OPTIONS = [
  "Lesson planning takes too long",
  "Marking and feedback burden is unsustainable",
  "Personal and professional life constantly clash",
  "Deadlines surprise me or cluster together badly",
  "Cover planning is chaotic",
  "Assessment data doesn't connect to what I plan",
  "I start from a blank page too often",
  "I feel overwhelmed and unable to prioritise",
  "Weekend and evening work feels unavoidable",
];

const TOOLS_OPTIONS = [
  "Paper planner / diary",
  "Google Classroom",
  "Microsoft Teams / OneNote",
  "A dedicated planning app (e.g. Planbook, PlanIt+)",
  "An AI tool (e.g. ChatGPT, Gemini, Copilot)",
  "School MIS (e.g. Arbor, Bromcom, Insight)",
  "Shared drive / Google Drive",
  "None of the above",
  "Other (free text)",
];

const AI_SAT_OPTIONS = [
  "I have not tried one",
  "Very dissatisfied - the output was unusable",
  "Somewhat dissatisfied - needed a lot of editing",
  "Neutral - had some use but felt too generic",
  "Satisfied - saved time with minor tweaks",
  "Very satisfied - genuinely changed my workflow",
];

const FEATURE_RATING_ITEMS = [
  { key: "weekly_timetable", label: "Weekly timetable that integrates personal and professional commitments" },
  { key: "ai_lesson_plan", label: "AI lesson plan generator aligned to the National Curriculum" },
  { key: "workload_warnings", label: "Workload warnings and clash alerts" },
  { key: "assessment_import", label: "Assessment data import with retrieval/next-step suggestions" },
  { key: "policy_enforcement", label: "School/trust policy and template enforcement built in" },
  { key: "cover_builder", label: "Cover lesson builder" },
  { key: "smart_todo", label: "Smart to-do list that schedules tasks into free windows" },
];

function isBlank(value) {
  return String(value || "").trim().length === 0;
}

export default function PartA({ answers, onChange, onNext, onBack, saving, onValidationError }) {
  const [errors, setErrors] = useState({});

  function validate() {
    const nextErrors = {};

    if (isBlank(answers.a_role)) nextErrors.a_role = "Please choose your role.";
    if (answers.a_role === "Other (free text)" && isBlank(answers.a_role_other)) {
      nextErrors.a_role_other = "Please tell us your role.";
    }

    if (isBlank(answers.a_years_experience)) nextErrors.a_years_experience = "Please select one option.";
    if (isBlank(answers.a_school_type)) nextErrors.a_school_type = "Please select your setting.";
    if (!Array.isArray(answers.a_template_alignment_issues) || answers.a_template_alignment_issues.length === 0) {
      nextErrors.a_template_alignment_issues = "Select at least one option.";
    }

    if (!Array.isArray(answers.a_challenges) || answers.a_challenges.length === 0) {
      nextErrors.a_challenges = "Select at least one challenge.";
    }

    if (!Array.isArray(answers.a_current_tools) || answers.a_current_tools.length === 0) {
      nextErrors.a_current_tools = "Select at least one tool or choose none of the above.";
    }

    if (answers.a_current_tools?.includes("Other (free text)") && isBlank(answers.a_current_tools_other)) {
      nextErrors.a_current_tools_other = "Please tell us the other tool.";
    }

    if (isBlank(answers.a_ai_satisfaction)) nextErrors.a_ai_satisfaction = "Please select one option.";

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
      <h2 className="surveyx-part-title">Part A - Your Context & Current Reality</h2>

      <QuestionBlock number={1} label="What is your current primary role?" required error={errors.a_role || errors.a_role_other}>
        <RadioGroup
          name="a_role"
          options={ROLE_OPTIONS}
          value={answers.a_role}
          onChange={(value) => onChange("a_role", value)}
        />
        {answers.a_role === "Other (free text)" ? (
          <label className="surveyx-field" style={{ marginTop: "0.5rem" }}>
            <span>Please specify</span>
            <input value={answers.a_role_other || ""} onChange={(event) => onChange("a_role_other", event.target.value)} />
          </label>
        ) : null}
      </QuestionBlock>

      <QuestionBlock number={2} label="How many years have you worked in primary education?" required error={errors.a_years_experience}>
        <RadioGroup
          name="a_years_experience"
          options={EXPERIENCE_OPTIONS}
          value={answers.a_years_experience}
          onChange={(value) => onChange("a_years_experience", value)}
        />
      </QuestionBlock>

      <QuestionBlock number={3} label="What type of school or setting are you based in?" required error={errors.a_school_type}>
        <RadioGroup
          name="a_school_type"
          options={SCHOOL_TYPE_OPTIONS}
          value={answers.a_school_type}
          onChange={(value) => onChange("a_school_type", value)}
        />
      </QuestionBlock>

      <QuestionBlock
        number={4}
        label="Roughly how many hours per week do you, or your staff if non teaching, spend on planning, preparation and assessment outside designated PPA time?"
        required
        error={errors.a_template_alignment_issues}
      >
        <CheckboxGroup
          name="a_template_alignment_issues"
          options={TEMPLATE_ALIGNMENT_OPTIONS}
          values={answers.a_template_alignment_issues || []}
          onChange={(value) => onChange("a_template_alignment_issues", value)}
        />
      </QuestionBlock>

      <QuestionBlock
        number={5}
        label="Which of the following best describe your biggest workload challenges?"
        hint="Select all that apply."
        required
        error={errors.a_challenges}
      >
        <CheckboxGroup name="a_challenges" options={CHALLENGE_OPTIONS} values={answers.a_challenges || []} onChange={(value) => onChange("a_challenges", value)} />
      </QuestionBlock>

      <QuestionBlock
        number={6}
        label="Describe a specific moment this term when your workload felt genuinely unmanageable. What caused it, and what would have helped?"
      >
        <TextArea
          value={answers.a_unmanageable_moment || ""}
          onChange={(value) => onChange("a_unmanageable_moment", value)}
          rows={5}
          placeholder="Be as honest as you like - this is the most valuable response in the survey."
        />
      </QuestionBlock>

      <QuestionBlock
        number={7}
        label="How would you rate your current work-life balance?"
      >
        <RatingScale
          name="a_wlb_rating"
          value={answers.a_wlb_rating}
          onChange={(value) => onChange("a_wlb_rating", value)}
          leftLabel="I am burning out"
          rightLabel="Healthy and sustainable"
        />
      </QuestionBlock>

      <QuestionBlock
        number={8}
        label="Do you currently use any digital tools to help manage planning or workload?"
        hint="Select all that apply."
        required
        error={errors.a_current_tools || errors.a_current_tools_other}
      >
        <CheckboxGroup
          name="a_current_tools"
          options={TOOLS_OPTIONS}
          values={answers.a_current_tools || []}
          onChange={(value) => onChange("a_current_tools", value)}
          otherOptionValue="Other (free text)"
          otherValue={answers.a_current_tools_other || ""}
          onOtherChange={(value) => onChange("a_current_tools_other", value)}
        />
      </QuestionBlock>

      <QuestionBlock number={9} label="If you have tried an AI tool for planning, how satisfied were you?" required error={errors.a_ai_satisfaction}>
        <RadioGroup
          name="a_ai_satisfaction"
          options={AI_SAT_OPTIONS}
          value={answers.a_ai_satisfaction}
          onChange={(value) => onChange("a_ai_satisfaction", value)}
        />
        {answers.a_ai_satisfaction && answers.a_ai_satisfaction !== "I have not tried one" ? (
          <div style={{ marginTop: "0.6rem" }}>
            <TextArea
              value={answers.a_ai_satisfaction_detail || ""}
              onChange={(value) => onChange("a_ai_satisfaction_detail", value)}
              rows={4}
              placeholder="What worked or did not work for you?"
            />
          </div>
        ) : null}
      </QuestionBlock>

      <QuestionBlock
        number={10}
        label="Imagine an AI system existed and worked perfectly. What would be the single biggest difference it would make to your working week?"
      >
        <TextArea
          value={answers.a_biggest_difference || ""}
          onChange={(value) => onChange("a_biggest_difference", value)}
          rows={4}
        />
      </QuestionBlock>

      <QuestionBlock
        number={11}
        label="Rate how important each of the following potential features is to you (1 = Not important at all, 6 = Absolutely essential)."
      >
        <RatingGrid
          name="a_feature_ratings"
          items={FEATURE_RATING_ITEMS}
          values={answers.a_feature_ratings || {}}
          onChange={(key, value) =>
            onChange("a_feature_ratings", {
              ...(answers.a_feature_ratings || {}),
              [key]: value,
            })
          }
        />
      </QuestionBlock>

      <QuestionBlock
        number={12}
        label="What would make you trust an AI platform enough to use it regularly in your teaching?"
      >
        <TextArea
          value={answers.a_trust_factors || ""}
          onChange={(value) => onChange("a_trust_factors", value)}
          rows={4}
        />
      </QuestionBlock>

      <PartNav onBack={onBack} onNext={handleNext} saving={saving} />
    </section>
  );
}
