function normalizeOption(option) {
  if (typeof option === "string") return { value: option, label: option };
  return option;
}

function CheckIcon() {
  return (
    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
      <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function CheckboxGroup({
  name,
  options = [],
  values = [],
  onChange,
  otherOptionValue,
  otherValue,
  onOtherChange,
}) {
  const selected = new Set(values || []);

  function toggle(optionValue) {
    if (selected.has(optionValue)) {
      onChange(values.filter((item) => item !== optionValue));
      return;
    }
    onChange([...(values || []), optionValue]);
  }

  const showOther = Boolean(otherOptionValue && selected.has(otherOptionValue));

  return (
    <fieldset className="surveyx-fieldset">
      <legend className="sr-only">Select all that apply</legend>
      <div className="surveyx-checkbox-list">
        {options.map((raw) => {
          const option = normalizeOption(raw);
          const id = `${name}-${option.value}`.replace(/\s+/g, "-").toLowerCase();
          const isSelected = selected.has(option.value);
          return (
            <label key={option.value} htmlFor={id} className={`surveyx-checkbox-item${isSelected ? " is-selected" : ""}`}>
              <input
                id={id}
                type="checkbox"
                checked={isSelected}
                onChange={() => toggle(option.value)}
              />
              <span className="surveyx-check-mark" aria-hidden="true">
                {isSelected ? <CheckIcon /> : null}
              </span>
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>

      {showOther ? (
        <label className="surveyx-field" style={{ marginTop: "0.75rem" }}>
          <span>Please specify</span>
          <input value={otherValue || ""} onChange={(event) => onOtherChange(event.target.value)} />
        </label>
      ) : null}
    </fieldset>
  );
}
