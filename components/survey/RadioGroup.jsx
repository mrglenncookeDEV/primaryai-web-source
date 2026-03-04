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
          return (
            <label key={option.value} htmlFor={id} className="surveyx-radio-item">
              <input
                id={id}
                type="radio"
                name={name}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
