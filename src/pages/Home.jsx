const cards = [
  {
    page: 'demand',
    label: 'Demand Intelligence',
    mark: 'DI',
    text: 'Track product demand, priority scores, activity, and weekly sales patterns.'
  },
  {
    page: 'vendors',
    label: 'Vendor Analysis',
    mark: 'VA',
    text: 'Review purchase volume, vendor profitability, product catalogs, and monthly trends.'
  },
  {
    page: 'historical',
    label: 'Historical Sales',
    mark: 'HS',
    text: 'Explore top products by date and month from historical sales records.'
  }
];

export default function Home({ setPage }) {
  return (
    <div>
      <section className="home-hero">
        <h1>Welcome to F2B Analytics</h1>
        <p>Your central hub for demand forecasting, vendor performance, and sales history.</p>
      </section>
      <section className="landing-grid">
        {cards.map((card) => (
          <article className="landing-card" key={card.page}>
            <span>{card.mark}</span>
            <h2>{card.label}</h2>
            <p>{card.text}</p>
            <button type="button" onClick={() => setPage(card.page)}>
              Open
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}
