const navItems = [
  { key: 'home', label: 'Home', icon: 'H' },
  { key: 'demand', label: 'Demand Intelligence', icon: 'D' },
  { key: 'vendors', label: 'Vendor Analysis', icon: 'V' },
  { key: 'historical', label: 'Historical Sales', icon: 'S' },
  { key: 'wastage', label: 'Wastage & Shrinkage', icon: 'W' }
];

export default function Layout({ page, setPage, children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">F2B</span>
          <div>
            <strong>F2B Analytics</strong>
            <small>Sales intelligence</small>
          </div>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${page === item.key ? 'active' : ''}`}
              onClick={() => setPage(item.key)}
              type="button"
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
