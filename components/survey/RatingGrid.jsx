import { useEffect } from "react";

export default function RatingGrid({ name, items = [], values = {}, onChange }) {
  useEffect(() => {
    items.forEach((item) => {
      const current = Number(values?.[item.key]);
      if (!(current >= 1 && current <= 6)) {
        onChange(item.key, 3);
      }
    });
  }, [items, values, onChange]);

  return (
    <fieldset className="surveyx-fieldset">
      <legend className="sr-only">Rate each item from 1 to 6</legend>
      <div className="surveyx-grid-wrap">
        {items.map((item) => (
          <div key={item.key} className="surveyx-grid-row">
            <p>{item.label}</p>
            <div className="surveyx-grid-slider-row">
              <input
                id={`${name}-${item.key}-slider`}
                className="surveyx-slider"
                type="range"
                min={1}
                max={6}
                step={1}
                value={Number(values?.[item.key]) >= 1 && Number(values?.[item.key]) <= 6 ? Number(values[item.key]) : 3}
                onChange={(event) => onChange(item.key, Number(event.target.value))}
              />
              <div className="surveyx-slider-meta">
                <div className="surveyx-slider-ticks" aria-hidden="true">
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                  <span>6</span>
                </div>
                <strong className="surveyx-slider-value">
                  {Number(values?.[item.key]) >= 1 && Number(values?.[item.key]) <= 6 ? Number(values[item.key]) : 3}
                </strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
