export default function QuestionBlock({ number, label, required = false, hint, error, children }) {
  return (
    <section className="surveyx-question-block" aria-live="polite">
      <header className="surveyx-question-head">
        <h3>
          {label}
          {required ? <span className="surveyx-required"> *</span> : null}
        </h3>
        {hint ? <p className="surveyx-hint">{hint}</p> : null}
      </header>
      <div>{children}</div>
      {error ? <p className="surveyx-error">{error}</p> : null}
    </section>
  );
}
