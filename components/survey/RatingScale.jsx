const LEVELS = [1, 2, 3, 4, 5, 6];

export default function RatingScale({ name, value, onChange, leftLabel, rightLabel }) {
  const resolved = Number(value) >= 1 && Number(value) <= 6 ? Number(value) : null;

  return (
    <fieldset className="surveyx-fieldset">
      <legend className="sr-only">Rate on a scale from 1 to 6</legend>
      <div className="surveyx-scale-labels">
        <span>1 — {leftLabel}</span>
        <span>{rightLabel} — 6</span>
      </div>
      <div className="surveyx-seg-group" role="group">
        {LEVELS.map((n) => (
          <button
            key={n}
            type="button"
            className={`surveyx-seg-btn${resolved === n ? " is-active" : ""}`}
            onClick={() => onChange(n)}
            aria-pressed={resolved === n}
            aria-label={String(n)}
          >
            {n}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
