const ROLE_CARDS = [
  {
    value: "teacher",
    badge: "T",
    title: "Teacher",
    subtitle: "Classroom planning, curriculum coverage, and day-to-day workload.",
  },
  {
    value: "headteacher",
    badge: "HT",
    title: "Head Teacher",
    subtitle: "School-wide consistency, staff wellbeing, and policy implementation.",
  },
  {
    value: "trustleader",
    badge: "TL",
    title: "Trust Leader",
    subtitle: "Trust-wide oversight, governance, analytics, and rollout priorities.",
  },
  {
    value: "impartial",
    badge: "IE",
    title: "Impartial / External",
    subtitle: "Share a cross-role perspective across classroom, school, and trust needs.",
  },
];

export default function RoleSelector({ role, onSelect, onContinue }) {
  return (
    <section className="surveyx-card card">
      <p className="survey-kicker">PrimaryAI Product Development</p>
      <h1 className="survey-title">PrimaryAI - Educator Survey</h1>
      <p className="muted survey-description">
        Choose the role that best matches your perspective. We will adapt the survey sections to fit you.
      </p>

      <div className="surveyx-role-grid">
        {ROLE_CARDS.map((item) => (
          <button
            key={item.value}
            type="button"
            className={`surveyx-role-card${role === item.value ? " is-active" : ""}`}
            onClick={() => onSelect(item.value)}
          >
            <span className="surveyx-role-badge">{item.badge}</span>
            <span className="surveyx-role-title">{item.title}</span>
            <span className="surveyx-role-subtitle">{item.subtitle}</span>
          </button>
        ))}
      </div>

      <div className="surveyx-part-nav">
        <span />
        <button type="button" className="button surveyx-next-btn" disabled={!role} onClick={onContinue}>
          Continue
        </button>
      </div>
    </section>
  );
}
