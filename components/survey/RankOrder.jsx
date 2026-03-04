export default function RankOrder({ name, items = [], values = {}, onChange }) {
  const maxRank = items.length;

  return (
    <fieldset className="surveyx-fieldset">
      <legend className="sr-only">Rank each item by selecting a number</legend>
      <p className="surveyx-hint">Use each rank once (1 is where you spend the most time).</p>
      <div className="surveyx-rank-list">
        {items.map((item) => {
          const id = `${name}-${item}`.replace(/\s+/g, "-").toLowerCase();
          return (
            <label className="surveyx-rank-item" htmlFor={id} key={item}>
              <span>{item}</span>
              <select id={id} value={values[item] || ""} onChange={(event) => onChange(item, Number(event.target.value) || "") }>
                <option value="">Rank</option>
                {Array.from({ length: maxRank }, (_, idx) => idx + 1).map((rank) => (
                  <option key={rank} value={rank}>{rank}</option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
