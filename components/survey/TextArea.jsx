export default function TextArea({ value, onChange, placeholder, rows = 4, maxLength = 2000 }) {
  const count = String(value || "").length;

  return (
    <label className="surveyx-field">
      <textarea
        rows={rows}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
      />
      <span className="surveyx-char-count">{count}/{maxLength}</span>
    </label>
  );
}
