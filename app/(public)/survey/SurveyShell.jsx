"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

import PartA from "./PartA";
const PartB = dynamic(() => import("./PartB"));
const PartC = dynamic(() => import("./PartC"));
const ThankYou = dynamic(() => import("./ThankYou"));

const STORAGE_KEY = "primaryai-survey-id";

const PARTS_FOR_ROLE = {
  teacher: ["partA", "partB"],
  headteacher: ["partA", "partC"],
  trustleader: ["partA", "partC"],
  impartial: ["partA", "partB", "partC"],
};

const PART_NAMES = {
  partA: "Your Context & Current Reality",
  partB: "Your Classroom & Planning Reality",
  partC: "Your School, Your Staff, Your Standards",
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
  const [step, setStep] = useState("partA");
  const [role, setRole] = useState("impartial");
  const [answers, setAnswers] = useState(INITIAL_ANSWERS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const partsForRole = useMemo(() => PARTS_FOR_ROLE[role] || [], [role]);
  const currentPartIndex = partsForRole.findIndex((item) => item === step);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [step]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function restoreProgress() {
      const savedSurveyId = sessionStorage.getItem(STORAGE_KEY);
      if (!savedSurveyId) {
        return;
      }

      const timeout = window.setTimeout(() => controller.abort(), 1800);
      const response = await fetch(`/api/survey/${savedSurveyId}`, { signal: controller.signal });
      window.clearTimeout(timeout);
      if (!response.ok) {
        sessionStorage.removeItem(STORAGE_KEY);
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
      const effectiveRole = restoredRole || "impartial";
      if (!restoredRole) setRole("impartial");
      setStep(getFirstIncompleteStep(effectiveRole, restoredAnswers, row.completed));
    }

    restoreProgress().catch(() => {});

    return () => {
      active = false;
      controller.abort();
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

  function showValidationToast(message) {
    if (!message) return;
    const id = Date.now();
    setToast({ id, message });
    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3600);
  }

  function goBack() {
    const index = partsForRole.findIndex((item) => item === step);
    if (index <= 0) return;
    setStep(partsForRole[index - 1]);
  }

  async function saveAndNext(partKey) {

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

  if (step === "done") {
    return <ThankYou surveyId={surveyId} />;
  }

  const showProgress = currentPartIndex >= 0;
  const progressPct = showProgress ? ((currentPartIndex + 1) / partsForRole.length) * 100 : 0;

  return (
    <div className="surveyx-wrap">
      {showProgress ? (
        <section className="surveyx-progress card" aria-live="polite">
          <p>Part {currentPartIndex + 1} of {partsForRole.length}</p>
          <div className="surveyx-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progressPct)}>
            <span style={{ width: `${progressPct}%` }} />
          </div>
        </section>
      ) : null}

      {error ? <div className="surveyx-error-banner">{error}</div> : null}
      {toast ? (
        <div className="surveyx-toast" role="status" aria-live="assertive">
          {toast.message}
        </div>
      ) : null}

      {step === "partA" ? (
        <PartA
          answers={answers.partA}
          onChange={(key, value) => handleChange("partA", key, value)}
          onBack={goBack}
          onNext={() => saveAndNext("partA")}
          onValidationError={showValidationToast}
          saving={saving}
        />
      ) : null}

      {step === "partB" ? (
        <PartB
          answers={answers.partB}
          onChange={(key, value) => handleChange("partB", key, value)}
          onBack={goBack}
          onNext={() => saveAndNext("partB")}
          onValidationError={showValidationToast}
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
          onValidationError={showValidationToast}
          saving={saving}
          isFinal={currentPartIndex === partsForRole.length - 1}
        />
      ) : null}

    </div>
  );
}
