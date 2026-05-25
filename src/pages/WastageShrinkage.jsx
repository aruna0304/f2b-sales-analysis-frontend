import { useState, useMemo, useEffect } from 'react';
import { fmtInr, fmtInt } from '../utils/format.js';
import { PageHeader, DataTable, EmptyState, Loader, ErrorState } from '../components/Ui.jsx';
import { api } from '../api.js';


const WASTAGE_TYPES = ['All Types', 'Spoilage', 'Damage', 'Processing', 'Theft', 'Overstock', 'Expired', 'Transport Damage', 'Expire'];

const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function WastageShrinkage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filterStart, setFilterStart] = useState('2026-03-01');
  const [filterEnd, setFilterEnd] = useState(getTodayString());
  const [filterType, setFilterType] = useState('All Types');
  const [filterVendor, setFilterVendor] = useState('All Vendors');
  const [filterSearch, setFilterSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await api.wastage();
        setEntries(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const vendorsList = useMemo(() => {
    const list = new Set();
    entries.forEach(e => {
      if (e.vendorName) list.add(e.vendorName);
    });
    return ['All Vendors', ...Array.from(list).sort()];
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      if (filterType !== 'All Types' && entry.type?.toLowerCase() !== filterType.toLowerCase()) return false;
      if (filterVendor !== 'All Vendors' && entry.vendorName !== filterVendor) return false;
      if (filterStart && entry.date < filterStart) return false;
      if (filterEnd && entry.date > filterEnd) return false;
      if (filterSearch && 
        !entry.product?.toLowerCase().includes(filterSearch.toLowerCase()) && 
        !entry.vendorName?.toLowerCase().includes(filterSearch.toLowerCase())
      ) return false;
      return true;
    });
  }, [entries, filterType, filterVendor, filterStart, filterEnd, filterSearch]);

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

      {/* FILTERS */}
      <section className="ws-filter-panel glass-panel">
        <div className="ws-filter-grid">
          <label className="ws-field">
            <span>Start Date</span>
            <input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} />
          </label>
          <label className="ws-field">
            <span>End Date</span>
            <input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} />
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
            setFilterStart('2026-03-01'); setFilterEnd(getTodayString()); setFilterType('All Types'); setFilterVendor('All Vendors'); setFilterSearch('');
          }}>Clear</button>
        </div>
      </section>

      {/* MAIN TABLE */}
      <section className="ws-table-container glass-panel">
        <div className="ws-panel-header">
          <h2>Wastage Entries</h2>
          <span className="ws-badge">{filteredEntries.length} Records</span>
        </div>
        
        {filteredEntries.length > 0 ? (
          <DataTable columns={columns} rows={filteredEntries} />
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
