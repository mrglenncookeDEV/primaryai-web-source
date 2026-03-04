"use client";

import { useState } from "react";
import RadioGroup from "@/components/survey/RadioGroup";
import CheckboxGroup from "@/components/survey/CheckboxGroup";
import RatingScale from "@/components/survey/RatingScale";
import RatingGrid from "@/components/survey/RatingGrid";
import RankOrder from "@/components/survey/RankOrder";
import TextArea from "@/components/survey/TextArea";
import QuestionBlock from "@/components/survey/QuestionBlock";
import PartNav from "@/components/survey/PartNav";

const YEAR_GROUP_OPTIONS = [
  "Reception",
  "Year 1",
  "Year 2",
  "Year 3",
  "Year 4",
  "Year 5",
  "Year 6",
  "Mixed year group",
];

const LESSON_TIME_OPTIONS = [
  "Under 20 minutes",
  "20-40 minutes",
  "40-60 minutes",
  "1-2 hours",
  "More than 2 hours",
];

const TIME_SPENT_ITEMS = [
  "Writing learning intentions and success criteria",
  "Sourcing or creating resources and slides",
  "Adapting plans for SEND / lower and higher attainers",
  "Aligning to your school's scheme of work",
  "Formatting plans to match school templates",
];

const DIFFERENTIATION_OPTIONS = [
  "I create separate tasks for different ability groups",
  "I adapt resources on the day based on what I observe",
  "I use SEND plans or EHCP targets to guide adaptations",
  "I use assessment data to plan retrieval and next steps",
  "I rely on TA support for in-lesson differentiation",
  "I struggle to find time to differentiate meaningfully",
  "Other",
];

const COMPLIANCE_ITEMS = [
  { key: "uk_gdpr", label: "UK GDPR and data protection law" },
  { key: "dfe_expectations", label: "DfE AI safety expectations" },
  { key: "school_policy", label: "Your school's own data policy" },
  { key: "no_model_training", label: "No training of AI models on your pupils' data" },
  { key: "audit_trail", label: "Clear audit trail of what was generated and when" },
];

function isBlank(value) {
  return String(value || "").trim().length === 0;
}

function rankingIsValid(ranking) {
  const values = Object.values(ranking || {}).filter(Boolean);
  return values.length === TIME_SPENT_ITEMS.length && new Set(values).size === TIME_SPENT_ITEMS.length;
}

export default function PartB({ answers, onChange, onNext, onBack, saving, isFinal }) {
  const [errors, setErrors] = useState({});

  function validate() {
    const nextErrors = {};

    if (!Array.isArray(answers.b_year_groups) || answers.b_year_groups.length === 0) {
      nextErrors.b_year_groups = "Select at least one year group.";
    }

    if (isBlank(answers.b_lesson_plan_time)) {
      nextErrors.b_lesson_plan_time = "Please select one option.";
    }

    if (!rankingIsValid(answers.b_time_spent_ranking)) {
      nextErrors.b_time_spent_ranking = "Please rank each item from 1 to 5 using each rank once.";
    }

    if (isBlank(answers.b_scheme_alignment_rating)) nextErrors.b_scheme_alignment_rating = "Please add a rating.";
    if (isBlank(answers.b_nc_confidence_rating)) nextErrors.b_nc_confidence_rating = "Please add a rating.";

    if (!Array.isArray(answers.b_differentiation_methods) || answers.b_differentiation_methods.length === 0) {
      nextErrors.b_differentiation_methods = "Select at least one approach.";
    }

    if (answers.b_differentiation_methods?.includes("Other") && isBlank(answers.b_differentiation_methods_other)) {
      nextErrors.b_differentiation_methods_other = "Please specify the other method.";
    }

    if (isBlank(answers.b_assessment_ai_rating)) nextErrors.b_assessment_ai_rating = "Please add a rating.";

    const compliance = answers.b_compliance_ratings || {};
    if (COMPLIANCE_ITEMS.some((item) => !compliance[item.key])) {
      nextErrors.b_compliance_ratings = "Please rate each compliance requirement.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleNext() {
    if (!validate()) return;
    onNext();
  }

  return (
    <section className="surveyx-card card">
      <h2 className="surveyx-part-title">Part B - Your Classroom & Planning Reality</h2>

      <QuestionBlock number={13} label="What year group(s) do you currently teach?" required error={errors.b_year_groups}>
        <CheckboxGroup
          name="b_year_groups"
          options={YEAR_GROUP_OPTIONS}
          values={answers.b_year_groups || []}
          onChange={(value) => onChange("b_year_groups", value)}
        />
      </QuestionBlock>

      <QuestionBlock
        number={14}
        label="On average, how long does it take you to plan and resource a single lesson from scratch?"
        required
        error={errors.b_lesson_plan_time}
      >
        <RadioGroup
          name="b_lesson_plan_time"
          options={LESSON_TIME_OPTIONS}
          value={answers.b_lesson_plan_time}
          onChange={(value) => onChange("b_lesson_plan_time", value)}
        />
      </QuestionBlock>

      <QuestionBlock
        number={15}
        label="Where do you currently spend most of your planning time?"
        hint="Rank each area from 1 to 5."
        required
        error={errors.b_time_spent_ranking}
      >
        <RankOrder
          name="b_time_spent_ranking"
          items={TIME_SPENT_ITEMS}
          values={answers.b_time_spent_ranking || {}}
          onChange={(item, rank) =>
            onChange("b_time_spent_ranking", {
              ...(answers.b_time_spent_ranking || {}),
              [item]: rank,
            })
          }
        />
      </QuestionBlock>

      <QuestionBlock
        number={16}
        label="How well do your current lesson plans connect to your school's scheme of work?"
        required
        error={errors.b_scheme_alignment_rating}
      >
        <RatingScale
          name="b_scheme_alignment_rating"
          value={answers.b_scheme_alignment_rating}
          onChange={(value) => onChange("b_scheme_alignment_rating", value)}
          leftLabel="Not at all - I build everything from scratch"
          rightLabel="Perfectly - plans are always fully aligned"
        />
      </QuestionBlock>

      <QuestionBlock
        number={17}
        label="How confident are you that your lessons currently cover National Curriculum objectives consistently?"
        required
        error={errors.b_nc_confidence_rating}
      >
        <RatingScale
          name="b_nc_confidence_rating"
          value={answers.b_nc_confidence_rating}
          onChange={(value) => onChange("b_nc_confidence_rating", value)}
          leftLabel="Not confident at all"
          rightLabel="Completely confident"
        />
      </QuestionBlock>

      <QuestionBlock
        number={18}
        label="How do you currently differentiate lessons for different learners?"
        hint="Select all that apply."
        required
        error={errors.b_differentiation_methods || errors.b_differentiation_methods_other}
      >
        <CheckboxGroup
          name="b_differentiation_methods"
          options={DIFFERENTIATION_OPTIONS}
          values={answers.b_differentiation_methods || []}
          onChange={(value) => onChange("b_differentiation_methods", value)}
          otherOptionValue="Other"
          otherValue={answers.b_differentiation_methods_other || ""}
          onOtherChange={(value) => onChange("b_differentiation_methods_other", value)}
        />
      </QuestionBlock>

      <QuestionBlock
        number={19}
        label="If an AI tool could use your latest assessment data to suggest retrieval starters and adapted activities for next week, how useful would that be?"
        required
        error={errors.b_assessment_ai_rating}
      >
        <RatingScale
          name="b_assessment_ai_rating"
          value={answers.b_assessment_ai_rating}
          onChange={(value) => onChange("b_assessment_ai_rating", value)}
          leftLabel="Not useful at all"
          rightLabel="This would transform my practice"
        />
      </QuestionBlock>

      <QuestionBlock
        number={20}
        label="Describe your ideal lesson-planning experience in 3-5 sentences."
      >
        <TextArea
          value={answers.b_ideal_planning || ""}
          onChange={(value) => onChange("b_ideal_planning", value)}
          rows={5}
          placeholder="What does it feel like, how long does it take, and what does the output look like?"
        />
      </QuestionBlock>

      <QuestionBlock number={21} label="What would you never want an AI planning tool to do?">
        <TextArea
          value={answers.b_ai_red_lines || ""}
          onChange={(value) => onChange("b_ai_red_lines", value)}
          rows={4}
          placeholder="E.g. generate generic activities, ignore your class context, override your judgement..."
        />
      </QuestionBlock>

      <QuestionBlock
        number={22}
        label="How important is it that any AI tool your school uses complies with the following?"
        required
        error={errors.b_compliance_ratings}
      >
        <RatingGrid
          name="b_compliance_ratings"
          items={COMPLIANCE_ITEMS}
          values={answers.b_compliance_ratings || {}}
          onChange={(key, value) =>
            onChange("b_compliance_ratings", {
              ...(answers.b_compliance_ratings || {}),
              [key]: value,
            })
          }
        />
      </QuestionBlock>

      <QuestionBlock
        number={23}
        label="What's one thing you wish whoever is designing this platform truly understood about your day-to-day life as a teacher?"
      >
        <TextArea
          value={answers.b_one_thing || ""}
          onChange={(value) => onChange("b_one_thing", value)}
          rows={5}
        />
      </QuestionBlock>

      <PartNav onBack={onBack} onNext={handleNext} saving={saving} isFinal={isFinal} />
    </section>
  );
}
