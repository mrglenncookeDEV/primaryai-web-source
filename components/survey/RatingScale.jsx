import { useEffect } from "react";

export default function RatingScale({ name, value, onChange, leftLabel, rightLabel }) {
  const resolvedValue = Number(value) >= 1 && Number(value) <= 6 ? Number(value) : 3;

  useEffect(() => {
    if (!(Number(value) >= 1 && Number(value) <= 6)) {
      onChange(3);
    }
  }, [value, onChange]);

  return (
    <fieldset className="surveyx-fieldset">
      <legend className="sr-only">Rate on a scale from 1 to 6</legend>
      <div className="surveyx-scale-labels">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      <div className="surveyx-slider-wrap">
        <input
          id={`${name}-slider`}
          className="surveyx-slider"
          type="range"
          min={1}
          max={6}
          step={1}
          value={resolvedValue}
          onChange={(event) => onChange(Number(event.target.value))}
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
          <strong className="surveyx-slider-value">{resolvedValue}</strong>
        </div>
      </div>
    </fieldset>
  );
}
