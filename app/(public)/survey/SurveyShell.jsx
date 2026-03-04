"use client";

import { useEffect, useMemo, useState } from "react";
import RoleSelector from "./RoleSelector";
import PartA from "./PartA";
import PartB from "./PartB";
import PartC from "./PartC";
import PartD from "./PartD";
import ThankYou from "./ThankYou";

const STORAGE_KEY = "primaryai-survey-id";

const PARTS_FOR_ROLE = {
  teacher: ["partA", "partB"],
  headteacher: ["partA", "partC"],
  trustleader: ["partA", "partD"],
  impartial: ["partA", "partB", "partC", "partD"],
};

const PART_NAMES = {
  partA: "Your Context & Current Reality",
  partB: "Your Classroom & Planning Reality",
  partC: "Your School, Your Staff, Your Standards",
  partD: "System-Wide Consistency & Strategic Oversight",
};

const INITIAL_ANSWERS = {
  partA: {},
  partB: {},
  partC: {},
  partD: {},
};

function getFirstIncompleteStep(role, answers, completed) {
  const sequence = PARTS_FOR_ROLE[role] || [];
  if (completed) return "done";

  const firstMissing = sequence.find((part) => {
    const mappedKey = part;
    return Object.keys(answers[mappedKey] || {}).length === 0;
  });

  return firstMissing || "done";
}

export default function SurveyShell() {
  const [surveyId, setSurveyId] = useState(null);
  const [step, setStep] = useState("role");
  const [role, setRole] = useState(null);
  const [answers, setAnswers] = useState(INITIAL_ANSWERS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  const partsForRole = useMemo(() => PARTS_FOR_ROLE[role] || [], [role]);
  const currentPartIndex = partsForRole.findIndex((item) => item === step);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [step]);

  useEffect(() => {
    let active = true;

    async function restoreProgress() {
      const savedSurveyId = sessionStorage.getItem(STORAGE_KEY);
      if (!savedSurveyId) {
        if (active) setHydrated(true);
        return;
      }

      const response = await fetch(`/api/survey/${savedSurveyId}`);
      if (!response.ok) {
        sessionStorage.removeItem(STORAGE_KEY);
        if (active) setHydrated(true);
        return;
      }

      const row = await response.json();
      if (!active) return;

      const restoredRole = row.role || null;
      const restoredAnswers = {
        partA: row.part_a || {},
        partB: row.part_b || {},
        partC: row.part_c || {},
        partD: row.part_d || {},
      };

      setSurveyId(row.id);
      setRole(restoredRole);
      setAnswers(restoredAnswers);
      setStep(restoredRole ? getFirstIncompleteStep(restoredRole, restoredAnswers, row.completed) : "role");
      setHydrated(true);
    }

    restoreProgress().catch(() => {
      if (active) setHydrated(true);
    });

    return () => {
      active = false;
    };
  }, []);

  function handleChange(partKey, key, value) {
    setAnswers((prev) => ({
      ...prev,
      [partKey]: {
        ...prev[partKey],
        [key]: value,
      },
    }));
  }

  function goBack() {
    if (!role || step === "role") return;
    const index = partsForRole.findIndex((item) => item === step);
    if (index <= 0) {
      setStep("role");
      return;
    }
    setStep(partsForRole[index - 1]);
  }

  async function saveAndNext(partKey) {
    if (!role) return;

    const index = partsForRole.indexOf(partKey);
    const isFinalPart = index === partsForRole.length - 1;

    setSaving(true);
    setError(null);

    const payload = {
      role,
      part: partKey,
      answers: answers[partKey] || {},
      completed: isFinalPart,
    };

    if (surveyId) {
      payload.id = surveyId;
    }

    try {
      const response = await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setSaving(false);
        setError(body?.error || "Something went wrong saving your response - please try again.");
        return;
      }

      const resolvedId = surveyId || body.id;
      if (!surveyId && resolvedId) {
        setSurveyId(resolvedId);
        sessionStorage.setItem(STORAGE_KEY, resolvedId);
      }

      if (isFinalPart) {
        setStep("done");
      } else {
        setStep(partsForRole[index + 1]);
      }

      setSaving(false);
    } catch {
      setSaving(false);
      setError("Network error while saving your response. Please retry.");
    }
  }

  function handleRoleContinue() {
    if (!role) return;
    setStep("partA");
    setError(null);
  }

  if (!hydrated) {
    return (
      <section className="surveyx-card card">
        <p className="muted">Loading your survey...</p>
      </section>
    );
  }

  if (step === "done") {
    return <ThankYou surveyId={surveyId} />;
  }

  const showProgress = step !== "role" && currentPartIndex >= 0;
  const progressPct = showProgress ? ((currentPartIndex + 1) / partsForRole.length) * 100 : 0;

  return (
    <div className="surveyx-wrap">
      {showProgress ? (
        <section className="surveyx-progress card" aria-live="polite">
          <p>
            Part {currentPartIndex + 1} of {partsForRole.length} - {PART_NAMES[step]}
          </p>
          <div className="surveyx-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progressPct)}>
            <span style={{ width: `${progressPct}%` }} />
          </div>
        </section>
      ) : null}

      {error ? <div className="surveyx-error-banner">{error}</div> : null}

      {step === "role" ? (
        <RoleSelector role={role} onSelect={setRole} onContinue={handleRoleContinue} />
      ) : null}

      {step === "partA" ? (
        <PartA
          answers={answers.partA}
          onChange={(key, value) => handleChange("partA", key, value)}
          onBack={goBack}
          onNext={() => saveAndNext("partA")}
          saving={saving}
        />
      ) : null}

      {step === "partB" ? (
        <PartB
          answers={answers.partB}
          onChange={(key, value) => handleChange("partB", key, value)}
          onBack={goBack}
          onNext={() => saveAndNext("partB")}
          saving={saving}
          isFinal={currentPartIndex === partsForRole.length - 1}
        />
      ) : null}

      {step === "partC" ? (
        <PartC
          answers={answers.partC}
          onChange={(key, value) => handleChange("partC", key, value)}
          onBack={goBack}
          onNext={() => saveAndNext("partC")}
          saving={saving}
          isFinal={currentPartIndex === partsForRole.length - 1}
        />
      ) : null}

      {step === "partD" ? (
        <PartD
          answers={answers.partD}
          onChange={(key, value) => handleChange("partD", key, value)}
          onBack={goBack}
          onNext={() => saveAndNext("partD")}
          saving={saving}
          isFinal={currentPartIndex === partsForRole.length - 1}
        />
      ) : null}
    </div>
  );
}
