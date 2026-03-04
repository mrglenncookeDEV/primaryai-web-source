import SurveyShell from "./SurveyShell";

export const metadata = {
  title: "PrimaryAI — Educator Survey",
};

export default function SurveyPage() {
  return (
    <main className="page-wrap survey-shell">
      <SurveyShell />
    </main>
  );
}
