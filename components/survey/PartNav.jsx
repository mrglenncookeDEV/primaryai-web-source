export default function PartNav({ onBack, onNext, saving, isFinal = false }) {
  return (
    <div className="surveyx-part-nav">
      <button type="button" className="button" onClick={onBack} disabled={saving}>
        Back
      </button>
      <button type="button" className="button surveyx-next-btn" onClick={onNext} disabled={saving}>
        {saving ? <span className="surveyx-spinner" aria-hidden="true" /> : null}
        <span>{saving ? "Saving..." : isFinal ? "Submit" : "Next"}</span>
      </button>
    </div>
  );
}
