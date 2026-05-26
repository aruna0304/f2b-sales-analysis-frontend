import { useState, useMemo, useEffect } from 'react';
import { fmtInr, fmtInt } from '../utils/format.js';
import { PageHeader, DataTable, EmptyState, Loader, ErrorState, LineChart } from '../components/Ui.jsx';
import { api } from '../api.js';

const WASTAGE_TYPES = ['All Types', 'Spoilage', 'Damage', 'Processing', 'Theft', 'Overstock', 'Expired', 'Transport Damage', 'Expire'];

const MONTHS_LIST = [
  { value: 'All Months', label: 'All Months' },
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' }
];

const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getStartOfWeek = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay(); // 0 is Sunday
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const startOfWeek = new Date(date.setDate(diff));
  
  const sy = startOfWeek.getFullYear();
  const sm = String(startOfWeek.getMonth() + 1).padStart(2, '0');
  const sd = String(startOfWeek.getDate()).padStart(2, '0');
  return `${sy}-${sm}-${sd}`;
};

export default function WastageShrinkage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filterYear, setFilterYear] = useState('All Years');
  const [filterMonth, setFilterMonth] = useState('All Months');
  const [filterType, setFilterType] = useState('All Types');
  const [filterVendor, setFilterVendor] = useState('All Vendors');
  const [filterSearch, setFilterSearch] = useState('');
  const [metricType, setMetricType] = useState('loss');

  const [vendorsList, setVendorsList] = useState(['All Vendors']);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [wastageData, vendorSummary] = await Promise.all([
          api.wastage(),
          api.vendorSummary()
        ]);
        setEntries(wastageData);
        
        const vNames = new Set();
        vendorSummary.forEach(v => {
          if (v.vendorName) vNames.add(v.vendorName);
        });
        setVendorsList(['All Vendors', ...Array.from(vNames).sort()]);
        
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const yearsList = useMemo(() => {
    const years = new Set();
    entries.forEach(e => {
      if (e.date) {
        const y = e.date.substring(0, 4);
        if (y && !isNaN(y)) years.add(y);
      }
    });
    if (years.size === 0) {
      years.add('2026');
    }
    return ['All Years', ...Array.from(years).sort().reverse()];
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      if (filterType !== 'All Types' && entry.type?.toLowerCase() !== filterType.toLowerCase()) return false;
      if (filterVendor !== 'All Vendors' && entry.vendorName !== filterVendor) return false;
      
      if (entry.date) {
        const [y, m] = entry.date.split('-');
        if (filterYear !== 'All Years' && y !== filterYear) return false;
        if (filterMonth !== 'All Months' && m !== filterMonth) return false;
      } else {
        if (filterYear !== 'All Years' || filterMonth !== 'All Months') return false;
      }

      if (filterSearch && 
        !entry.product?.toLowerCase().includes(filterSearch.toLowerCase()) && 
        !entry.vendorName?.toLowerCase().includes(filterSearch.toLowerCase())
      ) return false;
      return true;
    });
  }, [entries, filterType, filterVendor, filterYear, filterMonth, filterSearch]);

  const kpis = useMemo(() => {
    let totalLoss = 0;
    let totalQty = 0;
    filteredEntries.forEach(e => {
      totalLoss += e.loss || 0;
      totalQty += e.quantityLost || 0;
    });
    return {
      records: filteredEntries.length,
      loss: totalLoss,
      qty: totalQty,
      nearExpiry: 0 // Mock value or calculate from data if possible
    };
  }, [filteredEntries]);

  const activeChartData = useMemo(() => {
    const groups = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    filteredEntries.forEach(entry => {
      if (!entry.date) return;

      const [y, m, d] = entry.date.split('-');
      const monthIdx = (parseInt(m, 10) - 1) || 0;
      const monthName = monthNames[monthIdx] || m;

      let groupKey = '';
      let label = '';
      let dateObj;

      if (filterYear !== 'All Years' && filterMonth !== 'All Months') {
        // Specific Month & Specific Year: daily resolution
        groupKey = entry.date;
        label = `${monthName} ${parseInt(d, 10)}`;
        dateObj = new Date(parseInt(y, 10), monthIdx, parseInt(d, 10));
      } else if (filterYear !== 'All Years') {
        // Specific Year, All Months: monthly resolution
        groupKey = `${y}-${m}`;
        label = monthName;
        dateObj = new Date(parseInt(y, 10), monthIdx, 1);
      } else if (filterMonth !== 'All Months') {
        // All Years, Specific Month: Group by Year (show yearly comparison for that month)
        groupKey = y;
        label = y;
        dateObj = new Date(parseInt(y, 10), monthIdx, 1);
      } else {
        // All Years, All Months: Monthly resolution over time
        groupKey = `${y}-${m}`;
        label = `${monthName} ${y.slice(-2)}`;
        dateObj = new Date(parseInt(y, 10), monthIdx, 1);
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          groupKey,
          label,
          loss: 0,
          qty: 0,
          dateObj
        };
      }
      groups[groupKey].loss += entry.loss || 0;
      groups[groupKey].qty += entry.quantityLost || 0;
    });

    // Sort chronologically
    return Object.values(groups)
      .sort((a, b) => a.dateObj - b.dateObj)
      .map(g => ({
        label: g.label,
        totalLoss: g.loss,
        totalQty: g.qty
      }));
  }, [filteredEntries, filterYear, filterMonth]);

  const analysis = useMemo(() => {
    const byVendor = {};
    const byProduct = {};
    
    filteredEntries.forEach(e => {
      const v = e.vendorName || 'Other Vendor';
      byVendor[v] = (byVendor[v] || 0) + (e.loss || 0);
      
      const p = e.product || 'Unknown';
      byProduct[p] = (byProduct[p] || 0) + (e.quantityLost || 0);
    });
    
    return {
      byVendor: Object.entries(byVendor).sort((a,b) => b[1] - a[1]).slice(0, 5), // Top 5
      byProduct: Object.entries(byProduct).sort((a,b) => b[1] - a[1]).slice(0, 5) // Top 5
    };
  }, [filteredEntries]);

  const columns = [
    { key: 'code', label: 'Code', render: (row) => <strong style={{ color: '#4f46e5', fontSize: '11px' }}>{row.code.slice(-6).toUpperCase()}</strong> },
    { key: 'date', label: 'Date' },
    { key: 'product', label: 'Product', render: (row) => <span style={{ fontWeight: '600' }}>{row.product}</span> },
    { key: 'vendorName', label: 'Vendor', render: (row) => <span style={{ color: '#475569', fontWeight: '500' }}>{row.vendorName || 'Other Vendor'}</span> },
    { key: 'type', label: 'Type', render: (row) => <StatusChip type={row.type || 'Unknown'} /> },
    { key: 'quantityLost', label: 'Quantity Lost', render: (row) => `${Number(row.quantityLost || 0).toLocaleString('en-IN', {maximumFractionDigits: 2})} KG` },
    { key: 'loss', label: '₹ Loss', render: (row) => <span style={{ color: '#ef4444', fontWeight: '600' }}>{fmtInr(row.loss)}</span> }
  ];

  if (loading) return <div className="ws-container fade-in"><Loader label="Loading Wastage Data..." /></div>;
  if (error) return <div className="ws-container fade-in"><ErrorState error={error} /></div>;

  return (
    <div className="ws-container fade-in">
      {/* HEADER SECTION */}
      <header className="ws-header">
        <div className="ws-header-title">
          <div className="ws-icon-box primary">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </div>
          <div>
            <h1>Wastage & Shrinkage Analysis</h1>
            <p>Live tracking of inventory wastage from dailystockentries</p>
          </div>
        </div>
      </header>

      {/* KPI CARDS */}
      <section className="ws-kpi-grid">
        <KpiCard title="Total Records" value={fmtInt(kpis.records)} icon="file" color="blue" />
        <KpiCard title="Total Monetary Loss" value={fmtInr(kpis.loss)} icon="trending-down" color="red" />
        <KpiCard title="Total Quantity Lost" value={`${Number(kpis.qty || 0).toLocaleString('en-IN', {maximumFractionDigits: 2})} KG`} icon="package-minus" color="orange" />
      </section>

      {/* FILTERS */}
      <section className="ws-filter-panel glass-panel">
        <div className="ws-filter-grid">
          <label className="ws-field">
            <span>Choose Year</span>
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
              {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <label className="ws-field">
            <span>Choose Month</span>
            <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
              {MONTHS_LIST.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </label>
          <label className="ws-field">
            <span>Wastage Type</span>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              {WASTAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="ws-field">
            <span>Vendor</span>
            <select value={filterVendor} onChange={(e) => setFilterVendor(e.target.value)}>
              {vendorsList.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <label className="ws-field">
            <span>Product Search</span>
            <input type="text" placeholder="Search product or vendor..." value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} />
          </label>
        </div>
        <div className="ws-filter-actions">
          <button className="ws-btn-ghost" onClick={() => {
            setFilterYear('All Years'); setFilterMonth('All Months'); setFilterType('All Types'); setFilterVendor('All Vendors'); setFilterSearch('');
          }}>Clear</button>
        </div>
      </section>

      {/* WASTAGE TRENDS GRAPH */}
      <section className="glass-panel" style={{ marginBottom: '24px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: '0', fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>Wastage Trend Analysis</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              {filterYear === 'All Years' && filterMonth === 'All Months' && "Monthly wastage trends over all time"}
              {filterYear !== 'All Years' && filterMonth === 'All Months' && `Monthly wastage trends for ${filterYear}`}
              {filterYear !== 'All Years' && filterMonth !== 'All Months' && `Daily wastage trends for ${MONTHS_LIST.find(m => m.value === filterMonth)?.label} ${filterYear}`}
              {filterYear === 'All Years' && filterMonth !== 'All Months' && `Yearly comparison for ${MONTHS_LIST.find(m => m.value === filterMonth)?.label}`}
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* Metric Toggle */}
            <div className="btn-group-toggle" style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
              <button 
                type="button"
                className={`toggle-btn ${metricType === 'loss' ? 'active' : ''}`}
                onClick={() => setMetricType('loss')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  border: 'none',
                  background: metricType === 'loss' ? '#ffffff' : 'transparent',
                  color: metricType === 'loss' ? '#0f172a' : '#64748b',
                  boxShadow: metricType === 'loss' ? '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Loss (₹)
              </button>
              <button 
                type="button"
                className={`toggle-btn ${metricType === 'qty' ? 'active' : ''}`}
                onClick={() => setMetricType('qty')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  border: 'none',
                  background: metricType === 'qty' ? '#ffffff' : 'transparent',
                  color: metricType === 'qty' ? '#0f172a' : '#64748b',
                  boxShadow: metricType === 'qty' ? '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Qty (KG)
              </button>
            </div>
          </div>
        </div>

        {/* Graph Display */}
        {activeChartData.length > 1 ? (
          <LineChart 
            rows={activeChartData}
            xKey="label"
            series={[{
              key: metricType === 'loss' ? 'totalLoss' : 'totalQty',
              label: metricType === 'loss' ? 'Monetary Loss' : 'Quantity Lost',
              color: metricType === 'loss' ? '#ef4444' : '#f97316',
              formatter: metricType === 'loss' ? fmtInr : (val) => `${Number(val || 0).toLocaleString('en-IN', {maximumFractionDigits: 2})} KG`
            }]}
          />
        ) : (
          <div style={{ height: '240px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '14px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <strong>Not enough data points</strong>
            <span style={{ fontSize: '12px', marginTop: '4px' }}>Try broadening your date filters to see a trend line.</span>
          </div>
        )}
      </section>

      {/* ANALYSIS SECTION */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <div className="glass-panel">
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#0f172a' }}>Top Vendors whose Wastage is More</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {analysis.byVendor.map(([vendor, amount]) => {
              const maxAmount = analysis.byVendor[0]?.[1] || 1;
              const pct = (amount / maxAmount) * 100;
              return (
                <div key={vendor} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '120px', fontWeight: '500', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={vendor}>{vendor}</div>
                  <div style={{ flex: 1, background: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#6366f1', borderRadius: '4px' }}></div>
                  </div>
                  <div style={{ width: '80px', textAlign: 'right', fontWeight: '600', color: '#0f172a', fontSize: '13px' }}>{fmtInr(amount)}</div>
                </div>
              );
            })}
            {analysis.byVendor.length === 0 && <span style={{ color: '#64748b' }}>No data available</span>}
          </div>
        </div>
        
        <div className="glass-panel">
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#0f172a' }}>Top Products Wastage (Qty)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {analysis.byProduct.map(([product, qty]) => {
              const maxQty = analysis.byProduct[0]?.[1] || 1;
              const pct = (qty / maxQty) * 100;
              return (
                <div key={product} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '120px', fontWeight: '500', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={product}>{product}</div>
                  <div style={{ flex: 1, background: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#f97316', borderRadius: '4px' }}></div>
                  </div>
                  <div style={{ width: '60px', textAlign: 'right', fontWeight: '600', color: '#0f172a', fontSize: '13px' }}>{fmtInt(qty)} KG</div>
                </div>
              );
            })}
            {analysis.byProduct.length === 0 && <span style={{ color: '#64748b' }}>No data available</span>}
          </div>
        </div>
      </section>

      {/* MAIN TABLE */}
      <section className="ws-table-container glass-panel">
        <div className="ws-panel-header">
          <h2>Wastage Entries</h2>
          <span className="ws-badge">{filteredEntries.length} Records</span>
        </div>
        
        {filteredEntries.length > 0 ? (
          <DataTable columns={columns} rows={filteredEntries} paginate={true} />
        ) : (
          <div className="ws-empty-state">
            <div className="ws-empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </div>
            <h3>No wastage entries found</h3>
            <p>Try adjusting your filters</p>
          </div>
        )}
      </section>
    </div>
  );
}

// Subcomponents
function KpiCard({ title, value, icon, color, alert }) {
  return (
    <div className={`ws-kpi-card border-${color}`}>
      <div className="ws-kpi-content">
        <span className="ws-kpi-title">{title}</span>
        <strong className="ws-kpi-value">{value}</strong>
        {alert && <span className="ws-kpi-alert">Action Required</span>}
      </div>
      <div className={`ws-kpi-icon-bg bg-${color}`}>
        {icon === 'file' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>}
        {icon === 'trending-down' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>}
        {icon === 'package-minus' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/><line x1="8" y1="12" x2="16" y2="12"/></svg>}
        {icon === 'alert-triangle' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
      </div>
    </div>
  );
}

function StatusChip({ type }) {
  const t = String(type).toLowerCase();
  let colorClass = 'chip-default';
  if (t.includes('spoil')) colorClass = 'chip-red';
  else if (t.includes('damage')) colorClass = 'chip-orange';
  else if (t.includes('theft')) colorClass = 'chip-yellow';
  else if (t.includes('process')) colorClass = 'chip-blue';
  else if (t.includes('overstock')) colorClass = 'chip-purple';
  else if (t.includes('expire')) colorClass = 'chip-red';

  return <span className={`ws-status-chip ${colorClass}`}>{type}</span>;
}
