function normalizeOption(option) {
  if (typeof option === "string") return { value: option, label: option };
  return option;
}

export default function RadioGroup({ name, options = [], value, onChange }) {
  return (
    <fieldset className="surveyx-fieldset">
      <legend className="sr-only">Select one option</legend>
      <div className="surveyx-radio-list">
        {options.map((raw) => {
          const option = normalizeOption(raw);
          const id = `${name}-${option.value}`.replace(/\s+/g, "-").toLowerCase();
          const isSelected = value === option.value;
          return (
            <label key={option.value} htmlFor={id} className={`surveyx-radio-item${isSelected ? " is-selected" : ""}`}>
              <input
                id={id}
                type="radio"
                name={name}
                checked={isSelected}
                onChange={() => onChange(option.value)}
              />
              <span className="surveyx-radio-dot" aria-hidden="true" />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
