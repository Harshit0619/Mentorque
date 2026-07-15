export function StatsStrip({ items }) {
  return (
    <section className="stats-strip">
      {items.map((item) => (
        <article key={item.label} className="stat-card">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.helper && <small>{item.helper}</small>}
        </article>
      ))}
    </section>
  );
}
