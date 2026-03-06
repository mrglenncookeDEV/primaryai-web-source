const LEVELS = [1, 2, 3, 4, 5, 6];

export default function RatingGrid({ name, items = [], values = {}, onChange }) {
  return (
    <fieldset className="surveyx-fieldset">
      <legend className="sr-only">Rate each item from 1 to 6</legend>
      <div className="surveyx-scale-labels" style={{ marginBottom: "0.9rem" }}>
        <span>1 — Not important</span>
        <span>Absolutely essential — 6</span>
      </div>
      <div className="surveyx-grid-wrap">
        {items.map((item) => {
          const current = Number(values?.[item.key]) >= 1 && Number(values?.[item.key]) <= 6
            ? Number(values[item.key])
            : null;
          return (
            <div key={item.key} className="surveyx-grid-row">
              <p>{item.label}</p>
              <div className="surveyx-seg-group" role="group" aria-label={item.label}>
                {LEVELS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`surveyx-seg-btn${current === n ? " is-active" : ""}`}
                    onClick={() => onChange(item.key, n)}
                    aria-pressed={current === n}
                    aria-label={String(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
