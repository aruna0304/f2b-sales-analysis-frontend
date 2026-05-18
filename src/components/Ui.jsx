import { useState } from 'react';
import { fmtInt } from '../utils/format.js';

export function PageHeader({ title, subtitle, action }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <small>Last updated: {new Date().toLocaleString()}</small>
      </div>
      {action}
    </header>
  );
}

export function MetricCard({ label, value, tone = 'blue', delta }) {
  return (
    <section className={`metric-card tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {delta ? <small>{delta}</small> : null}
    </section>
  );
}

export function Loader({ label = 'Loading data...' }) {
  return <div className="state-box">{label}</div>;
}

export function EmptyState({ title, detail }) {
  return (
    <div className="state-box">
      <strong>{title}</strong>
      {detail ? <span>{detail}</span> : null}
    </div>
  );
}

export function ErrorState({ error }) {
  return (
    <div className="state-box error">
      <strong>Unable to load data</strong>
      <span>{error?.message || String(error)}</span>
    </div>
  );
}

export function DataTable({ columns, rows, maxRows }) {
  const visibleRows = maxRows ? rows.slice(0, maxRows) : rows;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th style={{ width: '60px', textAlign: 'center' }}>S.No</th>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row, index) => (
            <tr key={row.id || row.vendorId || row.productId || `${index}-${columns[0]?.key}`}>
              <td style={{ textAlign: 'center', fontWeight: '600', color: '#6b7280' }}>{index + 1}</td>
              {columns.map((column) => (
                <td key={column.key}>{column.render ? column.render(row, index) : row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {visibleRows.length === 0 ? <EmptyState title="No rows match the current filters" /> : null}
    </div>
  );
}

export function MultiSelect({ label, options, value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select
        multiple
        value={value}
        onChange={(event) =>
          onChange([...event.target.selectedOptions].map((option) => option.value))
        }
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function BarList({ rows, labelKey, valueKey, formatter = fmtInt, limit = 10 }) {
  const visible = rows.slice(0, limit);
  const max = Math.max(...visible.map((row) => Number(row[valueKey]) || 0), 1);
  return (
    <div className="bar-list">
      {visible.map((row, index) => {
        const value = Number(row[valueKey]) || 0;
        return (
          <div className="bar-row" key={`${row[labelKey]}-${index}`}>
            <span>{row[labelKey]}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${Math.max((value / max) * 100, 2)}%` }} />
            </div>
            <strong>{formatter(value)}</strong>
          </div>
        );
      })}
    </div>
  );
}

export function DonutChart({ rows, labelKey, valueKey, formatter = fmtInt, limit = 6, centerLabel = 'Total' }) {
  const visible = rows.slice(0, limit);
  const total = visible.reduce((amount, row) => amount + (Number(row[valueKey]) || 0), 0);
  let offset = 25;
  const colors = ['#2563eb', '#10b981', '#f59e0b', '#7c3aed', '#ef4444', '#0f766e', '#64748b'];

  return (
    <div className="donut-layout">
      <svg className="donut-chart" viewBox="0 0 42 42" role="img">
        <circle className="donut-ring" cx="21" cy="21" r="15.915" />
        {visible.map((row, index) => {
          const value = Number(row[valueKey]) || 0;
          const percent = total ? (value / total) * 100 : 0;
          const dashArray = `${percent} ${100 - percent}`;
          const dashOffset = offset;
          offset -= percent;
          return (
            <circle
              key={`${row[labelKey]}-${index}`}
              className="donut-segment"
              cx="21"
              cy="21"
              r="15.915"
              stroke={colors[index % colors.length]}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
            />
          );
        })}
        <text x="21" y="19.5" textAnchor="middle" className="donut-center-label">
          {centerLabel}
        </text>
        <text x="21" y="24" textAnchor="middle" className="donut-center-value">
          {formatter(total)}
        </text>
      </svg>
      <div className="donut-legend">
        {visible.map((row, index) => {
          const value = Number(row[valueKey]) || 0;
          const percent = total ? (value / total) * 100 : 0;
          return (
            <div key={`${row[labelKey]}-${index}`}>
              <i style={{ background: colors[index % colors.length] }} />
              <span>{row[labelKey]}</span>
              <strong>{percent.toFixed(1)}%</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ColumnChart({ rows, labelKey, valueKey, formatter = fmtInt, color = '#2563eb' }) {
  const max = Math.max(...rows.map((row) => Number(row[valueKey]) || 0), 1);
  return (
    <div className="column-chart">
      {rows.map((row, index) => {
        const value = Number(row[valueKey]) || 0;
        return (
          <div className="column-item" key={`${row[labelKey]}-${index}`}>
            <div className="column-value">{formatter(value)}</div>
            <div className="column-track">
              <div className="column-fill" style={{ height: `${Math.max((value / max) * 100, 2)}%`, background: color }} />
            </div>
            <span>{row[labelKey]}</span>
          </div>
        );
      })}
    </div>
  );
}

export function LineChart({ rows, xKey, series }) {
  const width = 720;
  const height = 260;
  const padding = 34;
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [stickyPoint, setStickyPoint] = useState(null);

  const allValues = rows.flatMap((row) => series.map((item) => Number(row[item.key]) || 0));
  const max = Math.max(...allValues, 1);

  const pointsFor = (key) =>
    rows.map((row, index) => {
      const x = padding + (index * (width - padding * 2)) / Math.max(rows.length - 1, 1);
      const y = height - padding - ((Number(row[key]) || 0) / max) * (height - padding * 2);
      return { x, y, value: Number(row[key]) || 0, row };
    });

  const getBezierPath = (points) => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 2;
      const cp1y = p0.y;
      const cp2x = p0.x + (p1.x - p0.x) / 2;
      const cp2y = p1.y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const getAreaPath = (points) => {
    if (points.length === 0) return '';
    const curve = getBezierPath(points);
    return `${curve} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
  };

  const activeTooltip = hoveredPoint || stickyPoint;

  const isDotActive = (seriesKey, index) => {
    if (hoveredPoint && hoveredPoint.seriesKey === seriesKey && hoveredPoint.index === index) return true;
    if (stickyPoint && stickyPoint.seriesKey === seriesKey && stickyPoint.index === index) return true;
    return false;
  };

  return (
    <div className="chart-box" style={{ position: 'relative' }} onClick={() => setStickyPoint(null)}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        <defs>
          {series.map((item) => (
            <linearGradient key={`grad-${item.key}`} id={`grad-${item.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={item.color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={item.color} stopOpacity="0.00" />
            </linearGradient>
          ))}
        </defs>

        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} />

        {/* Shaded Areas */}
        {series.map((item) => {
          const pts = pointsFor(item.key);
          return (
            <path
              key={`area-${item.key}`}
              d={getAreaPath(pts)}
              fill={`url(#grad-${item.key})`}
              style={{ transition: 'all 0.3s ease' }}
            />
          );
        })}

        {/* Curves */}
        {series.map((item) => {
          const pts = pointsFor(item.key);
          return (
            <path
              key={`curve-${item.key}`}
              d={getBezierPath(pts)}
              fill="none"
              stroke={item.color}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transition: 'all 0.3s ease' }}
            />
          );
        })}

        {/* Interactive Dots */}
        {series.map((item) => {
          const pts = pointsFor(item.key);
          return pts.map((pt, i) => {
            const active = isDotActive(item.key, i);
            return (
              <circle
                key={`dot-${item.key}-${i}`}
                cx={pt.x}
                cy={pt.y}
                r={active ? 8 : 4}
                fill="#ffffff"
                stroke={item.color}
                strokeWidth={active ? 4 : 3}
                style={{ cursor: 'pointer', transition: 'r 0.15s ease, stroke-width 0.15s ease' }}
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const containerRect = e.currentTarget.closest('.chart-box').getBoundingClientRect();
                  const newSticky = {
                    index: i,
                    seriesKey: item.key,
                    x: rect.left - containerRect.left + rect.width / 2,
                    y: rect.top - containerRect.top - 8,
                    label: String(pt.row[xKey]),
                    seriesLabel: item.label,
                    valueFormatted: item.formatter ? item.formatter(pt.value) : pt.value,
                    products: item.key === 'previous' ? (pt.row.prevProducts || []) : (pt.row.products || [])
                  };
                  if (stickyPoint && stickyPoint.index === i && stickyPoint.seriesKey === item.key) {
                    setStickyPoint(null);
                  } else {
                    setStickyPoint(newSticky);
                  }
                }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const containerRect = e.currentTarget.closest('.chart-box').getBoundingClientRect();
                  setHoveredPoint({
                    index: i,
                    seriesKey: item.key,
                    x: rect.left - containerRect.left + rect.width / 2,
                    y: rect.top - containerRect.top - 8,
                    label: String(pt.row[xKey]),
                    seriesLabel: item.label,
                    valueFormatted: item.formatter ? item.formatter(pt.value) : pt.value,
                    products: item.key === 'previous' ? (pt.row.prevProducts || []) : (pt.row.products || [])
                  });
                }}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            );
          });
        })}

        {/* X-Axis Labels */}
        {rows.map((row, index) => {
          const x = padding + (index * (width - padding * 2)) / Math.max(rows.length - 1, 1);
          return (
            <text key={`${row[xKey]}-${index}`} x={x} y={height - 8} textAnchor="middle">
              {row[xKey]}
            </text>
          );
        })}
      </svg>

      {/* Floating / Sticky Tooltip */}
      {activeTooltip && (
        <div
          className="chart-tooltip"
          style={{
            left: activeTooltip.x,
            top: activeTooltip.y,
            transform: 'translate(-50%, -100%)',
            borderColor: stickyPoint === activeTooltip ? '#3b82f6' : 'rgba(255, 255, 255, 0.12)',
            borderWidth: stickyPoint === activeTooltip ? '2px' : '1px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="chart-tooltip-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{activeTooltip.label}</span>
            {stickyPoint === activeTooltip && (
              <button
                type="button"
                onClick={() => setStickyPoint(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  lineHeight: '1',
                  padding: '0 4px'
                }}
              >
                ×
              </button>
            )}
          </div>
          <div className="chart-tooltip-body">
            <span>{activeTooltip.seriesLabel}:</span>
            <strong>{activeTooltip.valueFormatted}</strong>
          </div>
          {activeTooltip.products && activeTooltip.products.length > 0 && (
            <div className="chart-tooltip-products">
              <div className="tooltip-section-title">Products ({activeTooltip.products.length}):</div>
              <ul>
                {activeTooltip.products.slice(0, 8).map((prod, idx) => (
                  <li key={idx} style={{ color: '#f1f5f9', fontWeight: '500' }}>{prod}</li>
                ))}
                {activeTooltip.products.length > 8 && (
                  <li className="tooltip-more-items">+ {activeTooltip.products.length - 8} more</li>
                )}
              </ul>
            </div>
          )}
          {stickyPoint === activeTooltip && (
            <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '4px', textAlign: 'center', fontStyle: 'italic' }}>
              Pinned. Click background to release.
            </div>
          )}
        </div>
      )}

      <div className="legend">
        {series.map((item) => (
          <span key={item.key}>
            <i style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function PillSelect({ label, options, value, onChange }) {
  const handleToggle = (option) => {
    if (value.includes(option)) {
      onChange(value.filter((o) => o !== option));
    } else {
      onChange([...value, option]);
    }
  };

  return (
    <div className="pill-select-group">
      <span className="pill-select-label">{label}</span>
      <div className="pill-select-options">
        {options.map((option) => {
          const isActive = value.includes(option);
          return (
            <button
              key={option}
              type="button"
              className={`pill-btn ${isActive ? 'active' : ''}`}
              onClick={() => handleToggle(option)}
            >
              <span className="pill-btn-indicator">{isActive ? '✓' : '+'}</span>
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
