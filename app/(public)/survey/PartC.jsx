"use client";

import { useState } from "react";
import RadioGroup from "@/components/survey/RadioGroup";
import CheckboxGroup from "@/components/survey/CheckboxGroup";
import RatingScale from "@/components/survey/RatingScale";
import RatingGrid from "@/components/survey/RatingGrid";
import TextArea from "@/components/survey/TextArea";
import QuestionBlock from "@/components/survey/QuestionBlock";
import PartNav from "@/components/survey/PartNav";

const STAFF_COUNT_OPTIONS = ["1-5", "6-10", "11-20", "21-40", "40+"];

const STAFF_CONCERN_OPTIONS = [
  "Staff are leaving or considering leaving due to workload",
  "Planning quality is inconsistent across year groups",
  "ECTs / NQTs are struggling to keep up with planning demands",
  "Planning takes too much time outside school hours",
  "Marking policies are creating unsustainable workloads",
  "Staff are using AI tools without any school oversight",
  "We have no clear picture of what is being planned across the school",
  "Scheme of work coverage is uneven across classes",
  "Other",
];

const LEADER_FEATURE_ITEMS = [
  { key: "template_enforcement", label: "Enforce your school's planning templates automatically" },
  { key: "marking_policy", label: "Reference and apply your feedback and marking policy" },
  { key: "send_expectations", label: "Apply your SEND toolkit and inclusion expectations" },
  { key: "non_negotiables", label: "Allow upload/enforcement of trust/school non-negotiables" },
  { key: "visibility", label: "Give visibility of staff planning (without micromanaging)" },
  { key: "workload_flags", label: "Flag when a teacher's workload looks unsustainable" },
  { key: "leader_reminders", label: "Allow you to send reminders, key dates, and priorities" },
];

const ATTRITION_OPTIONS = ["Yes, multiple", "Yes, one or two", "Not directly but I suspect it was a factor", "No"];

function isBlank(value) {
  return String(value || "").trim().length === 0;
}

export default function PartC({ answers, onChange, onNext, onBack, saving, isFinal }) {
  const [errors, setErrors] = useState({});

  function validate() {
    const nextErrors = {};

    if (isBlank(answers.c_staff_count)) nextErrors.c_staff_count = "Please select one option.";

    if (!Array.isArray(answers.c_staff_concerns) || answers.c_staff_concerns.length === 0) {
      nextErrors.c_staff_concerns = "Select at least one concern.";
    }

    if (answers.c_staff_concerns?.includes("Other") && isBlank(answers.c_staff_concerns_other)) {
      nextErrors.c_staff_concerns_other = "Please specify the other concern.";
    }

    if (isBlank(answers.c_policy_consistency_rating)) nextErrors.c_policy_consistency_rating = "Please add a rating.";

    const ratings = answers.c_leader_feature_ratings || {};
    if (LEADER_FEATURE_ITEMS.some((item) => !ratings[item.key])) {
      nextErrors.c_leader_feature_ratings = "Please rate each feature.";
    }

    if (isBlank(answers.c_wellbeing_priority_rating)) nextErrors.c_wellbeing_priority_rating = "Please add a rating.";
    if (isBlank(answers.c_teacher_attrition)) nextErrors.c_teacher_attrition = "Please select one option.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleNext() {
    if (!validate()) return;
    onNext();
  }

  return (
    <section className="surveyx-card card">
      <h2 className="surveyx-part-title">Part C - Your School, Your Staff, Your Standards</h2>

      <QuestionBlock number={24} label="How many teaching staff are in your school?" required error={errors.c_staff_count}>
        <RadioGroup
          name="c_staff_count"
          options={STAFF_COUNT_OPTIONS}
          value={answers.c_staff_count}
          onChange={(value) => onChange("c_staff_count", value)}
        />
      </QuestionBlock>

      <QuestionBlock
        number={25}
        label="What are your biggest concerns about staff workload right now?"
        hint="Select all that apply."
        required
        error={errors.c_staff_concerns || errors.c_staff_concerns_other}
      >
        <CheckboxGroup
          name="c_staff_concerns"
          options={STAFF_CONCERN_OPTIONS}
          values={answers.c_staff_concerns || []}
          onChange={(value) => onChange("c_staff_concerns", value)}
          otherOptionValue="Other"
          otherValue={answers.c_staff_concerns_other || ""}
          onOtherChange={(value) => onChange("c_staff_concerns_other", value)}
        />
      </QuestionBlock>

      <QuestionBlock
        number={26}
        label="How confident are you that planning across your school currently reflects your school policies and non-negotiables consistently?"
        required
        error={errors.c_policy_consistency_rating}
      >
        <RatingScale
          name="c_policy_consistency_rating"
          value={answers.c_policy_consistency_rating}
          onChange={(value) => onChange("c_policy_consistency_rating", value)}
          leftLabel="Not at all consistent"
          rightLabel="Completely consistent"
        />
      </QuestionBlock>

      <QuestionBlock
        number={27}
        label="When you observe or review lessons and planning, what are the most common gaps or concerns you encounter?"
      >
        <TextArea value={answers.c_planning_gaps || ""} onChange={(value) => onChange("c_planning_gaps", value)} rows={4} />
      </QuestionBlock>

      <QuestionBlock
        number={28}
        label="How important is it to you that a platform like PrimaryAI can:"
        required
        error={errors.c_leader_feature_ratings}
      >
        <RatingGrid
          name="c_leader_feature_ratings"
          items={LEADER_FEATURE_ITEMS}
          values={answers.c_leader_feature_ratings || {}}
          onChange={(key, value) =>
            onChange("c_leader_feature_ratings", {
              ...(answers.c_leader_feature_ratings || {}),
              [key]: value,
            })
          }
        />
      </QuestionBlock>

      <QuestionBlock
        number={29}
        label="What is the single biggest risk you see in staff using AI tools for planning without proper school oversight?"
      >
        <TextArea value={answers.c_ai_risk_concern || ""} onChange={(value) => onChange("c_ai_risk_concern", value)} rows={4} />
      </QuestionBlock>

      <QuestionBlock
        number={30}
        label="What would need to be true about an AI platform for you to actively recommend or purchase it for your school?"
      >
        <TextArea
          value={answers.c_purchase_criteria || ""}
          onChange={(value) => onChange("c_purchase_criteria", value)}
          rows={4}
          placeholder="Think about evidence, compliance, data safety, cost, ease of adoption..."
        />
      </QuestionBlock>

      <QuestionBlock
        number={31}
        label="On a scale of 1-6, how much of a priority is staff wellbeing and workload reduction when you make decisions about systems and tools?"
        required
        error={errors.c_wellbeing_priority_rating}
      >
        <RatingScale
          name="c_wellbeing_priority_rating"
          value={answers.c_wellbeing_priority_rating}
          onChange={(value) => onChange("c_wellbeing_priority_rating", value)}
          leftLabel="Not a significant factor"
          rightLabel="It is my primary concern"
        />
      </QuestionBlock>

      <QuestionBlock
        number={32}
        label="Have you seen teachers leave your school (or the profession) due to workload in the last three years?"
        required
        error={errors.c_teacher_attrition}
      >
        <RadioGroup
          name="c_teacher_attrition"
          options={ATTRITION_OPTIONS}
          value={answers.c_teacher_attrition}
          onChange={(value) => onChange("c_teacher_attrition", value)}
        />
      </QuestionBlock>

      <QuestionBlock
        number={33}
        label="What's the one thing you would want a platform like PrimaryAI to help you do that no existing tool currently does?"
      >
        <TextArea value={answers.c_one_thing || ""} onChange={(value) => onChange("c_one_thing", value)} rows={4} />
      </QuestionBlock>

      <PartNav onBack={onBack} onNext={handleNext} saving={saving} isFinal={isFinal} />
    </section>
  );
}
