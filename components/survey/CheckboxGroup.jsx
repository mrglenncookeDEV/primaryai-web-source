function normalizeOption(option) {
  if (typeof option === "string") return { value: option, label: option };
  return option;
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
          return (
            <label key={option.value} htmlFor={id} className="surveyx-checkbox-item">
              <input
                id={id}
                type="checkbox"
                checked={selected.has(option.value)}
                onChange={() => toggle(option.value)}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>

      {showOther ? (
        <label className="surveyx-field" style={{ marginTop: "0.5rem" }}>
          <span>Please specify</span>
          <input value={otherValue || ""} onChange={(event) => onOtherChange(event.target.value)} />
        </label>
      ) : null}
    </fieldset>
  );
}
