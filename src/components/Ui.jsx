import { useState, useRef, useEffect } from 'react';
import { fmtInt, fmtInr, fmtPct } from '../utils/format.js';

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

// Helper for dynamic boundary-avoiding tooltip positioning
function getTooltipStyles(activeTooltip, tooltipWidth = 260, tooltipHeight = 220) {
  if (!activeTooltip) return {};

  let left = activeTooltip.x - tooltipWidth / 2;
  // Apply horizontal bounds
  if (left < 10) {
    left = 10;
  }
  if (activeTooltip.containerWidth && left + tooltipWidth > activeTooltip.containerWidth - 10) {
    left = activeTooltip.containerWidth - tooltipWidth - 10;
  }

  // Apply vertical bounds (flip below if close to top)
  let top = activeTooltip.y - 12;
  let transform = 'translateY(-100%)';

  if (activeTooltip.y < tooltipHeight + 15) {
    top = activeTooltip.y + 25;
    transform = 'translateY(0)';
  }

  return {
    left,
    top,
    transform,
    position: 'absolute',
    transition: 'left 0.1s ease, top 0.1s ease, opacity 0.1s ease',
  };
}

export function ColumnChart({ rows, labelKey, valueKey, formatter = fmtInt, color = '#2563eb' }) {
  const width = 720;
  const height = 360;
  const paddingLeft = 75;
  const paddingRight = 20;
  const paddingTop = 40;
  const paddingBottom = 85;

  const [hoveredBar, setHoveredBar] = useState(null);
  const [stickyBar, setStickyBar] = useState(null);

  const values = rows.map((row) => Number(row[valueKey]) || 0);
  const max = Math.max(...values, 1000); // safety fallback

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const barSpacing = chartWidth / Math.max(rows.length, 1);

  const ticks = [0, max * 0.25, max * 0.5, max * 0.75, max];

  const activeTooltip = hoveredBar || stickyBar;

  const hasLongLabels = rows.some((row) => String(row[labelKey]).length > 10);

  return (
    <div className="chart-box" style={{ position: 'relative' }} onClick={() => setStickyBar(null)}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          {rows.map((_, i) => (
            <linearGradient key={`colGrad-${i}`} id={`colGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="1" />
              <stop offset="100%" stopColor={color} stopOpacity="0.75" />
            </linearGradient>
          ))}
          <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.15" />
          </filter>
        </defs>

        {/* Grid lines and Y-axis Labels */}
        {ticks.map((tickVal, idx) => {
          const y = height - paddingBottom - (tickVal / max) * chartHeight;
          return (
            <g key={`grid-col-${idx}`}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
                opacity="0.6"
              />
              <text
                x={paddingLeft - 10}
                y={y + 4}
                textAnchor="end"
                fill="#64748b"
                fontSize="11"
                fontWeight="500"
              >
                {formatter(tickVal)}
              </text>
            </g>
          );
        })}

        {/* X-Axis base line */}
        <line
          x1={paddingLeft}
          y1={height - paddingBottom}
          x2={width - paddingRight}
          y2={height - paddingBottom}
          stroke="#cbd5e1"
          strokeWidth="1.5"
        />

        {/* Bars */}
        {rows.map((row, index) => {
          const value = Number(row[valueKey]) || 0;
          const barHeight = (value / max) * chartHeight;
          const barWidth = barSpacing * 0.45;
          const x = paddingLeft + index * barSpacing + barSpacing / 2;
          const barX = x - barWidth / 2;
          const barY = height - paddingBottom - barHeight;

          const active =
            (hoveredBar && hoveredBar.index === index) || (stickyBar && stickyBar.index === index);

          return (
            <g key={`bar-group-${index}`}>
              {/* Rounded top corners rect */}
              <rect
                x={barX}
                y={barY}
                width={barWidth}
                height={Math.max(barHeight, 2)}
                rx="6"
                ry="6"
                fill={`url(#colGrad-${index})`}
                filter={active ? 'url(#shadow)' : undefined}
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  opacity: active ? 1 : 0.85
                }}
                className="column-bar"
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const containerRect = e.currentTarget.closest('.chart-box').getBoundingClientRect();
                  const prevValue = index > 0 ? Number(rows[index - 1][valueKey]) : 0;
                  const growthPct = prevValue > 0 ? ((value - prevValue) / prevValue) * 100 : 0;

                  const isProduct = !!row.productName;
                  const newSticky = {
                    index,
                    x: rect.left - containerRect.left + rect.width / 2,
                    y: rect.top - containerRect.top - 8,
                    containerWidth: containerRect.width,
                    month: String(row[labelKey]),
                    totalPurchase: value,
                    growthPct,
                    vendorCount: row.vendorCount || 0,
                    topVendorName: row.topVendorName || 'N/A',
                    topVendorAmt: row.topVendorAmt || 0,
                    isProduct,
                    productName: row.productName,
                    totalQuantity: row.totalQuantity,
                    vendorName: row.vendorName
                  };

                  if (stickyBar && stickyBar.index === index) {
                    setStickyBar(null);
                  } else {
                    setStickyBar(newSticky);
                  }
                }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const containerRect = e.currentTarget.closest('.chart-box').getBoundingClientRect();
                  const prevValue = index > 0 ? Number(rows[index - 1][valueKey]) : 0;
                  const growthPct = prevValue > 0 ? ((value - prevValue) / prevValue) * 100 : 0;

                  const isProduct = !!row.productName;
                  setHoveredBar({
                    index,
                    x: rect.left - containerRect.left + rect.width / 2,
                    y: rect.top - containerRect.top - 8,
                    containerWidth: containerRect.width,
                    month: String(row[labelKey]),
                    totalPurchase: value,
                    growthPct,
                    vendorCount: row.vendorCount || 0,
                    topVendorName: row.topVendorName || 'N/A',
                    topVendorAmt: row.topVendorAmt || 0,
                    isProduct,
                    productName: row.productName,
                    totalQuantity: row.totalQuantity,
                    vendorName: row.vendorName
                  });
                }}
                onMouseLeave={() => setHoveredBar(null)}
              />

              {/* Flatten bottom corner trick */}
              {barHeight > 6 && (
                <rect
                  x={barX}
                  y={height - paddingBottom - 6}
                  width={barWidth}
                  height={6}
                  fill={`url(#colGrad-${index})`}
                  style={{ pointerEvents: 'none', transition: 'opacity 0.25s ease', opacity: active ? 1 : 0.85 }}
                />
              )}

              {/* Exact Value above bar */}
              <text
                x={x}
                y={barY - 8}
                textAnchor="middle"
                fill={active ? color : '#334155'}
                fontWeight="700"
                fontSize="11"
                style={{ transition: 'all 0.25s ease' }}
              >
                {formatter(value)}
              </text>

              {/* X-axis label centered or rotated under bar */}
              {hasLongLabels ? (
                <text
                  x={0}
                  y={0}
                  transform={`translate(${x}, ${height - paddingBottom + 14}) rotate(-35)`}
                  textAnchor="end"
                  fill="#475569"
                  fontWeight="600"
                  fontSize="11"
                  className="chart-x-label rotated"
                >
                  {String(row[labelKey]).length > 18
                    ? String(row[labelKey]).slice(0, 15) + '...'
                    : String(row[labelKey])}
                </text>
              ) : (
                <text
                  x={x}
                  y={height - 15}
                  textAnchor="middle"
                  fill="#475569"
                  fontWeight="600"
                  fontSize="12"
                  className="chart-x-label"
                >
                  {String(row[labelKey])}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Dynamic positioning Tooltip */}
      {activeTooltip && (
        <div
          className="chart-tooltip"
          style={{
            ...getTooltipStyles(activeTooltip, 260, activeTooltip.isProduct ? 190 : 185),
            borderColor: stickyBar === activeTooltip ? (activeTooltip.isProduct ? '#3b82f6' : '#7c3aed') : 'rgba(255, 255, 255, 0.12)',
            borderWidth: stickyBar === activeTooltip ? '2px' : '1px',
            pointerEvents: stickyBar === activeTooltip ? 'auto' : 'none'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {activeTooltip.isProduct ? (
            <>
              <div className="chart-tooltip-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ whiteSpace: 'normal', display: 'block', maxWidth: '200px', lineHeight: '1.3' }}>
                  {activeTooltip.productName}
                </span>
                {stickyBar === activeTooltip && (
                  <button
                    type="button"
                    onClick={() => setStickyBar(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      lineHeight: '1',
                      padding: '0 4px',
                      alignSelf: 'flex-start'
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="chart-tooltip-body-grid" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8', fontWeight: '500' }}>Purchase Cost:</span>
                  <strong style={{ color: '#34d399', fontSize: '13px' }}>{formatter(activeTooltip.totalPurchase)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8', fontWeight: '500' }}>Quantity:</span>
                  <strong style={{ color: '#60a5fa', fontSize: '13px' }}>{fmtInt(activeTooltip.totalQuantity)}</strong>
                </div>
                {activeTooltip.vendorName && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '6px', paddingTop: '6px' }}>
                    <span style={{ color: '#94a3b8', fontSize: '10px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Vendor Name:</span>
                    <span style={{ color: '#ffffff', fontWeight: '600', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {activeTooltip.vendorName}
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="chart-tooltip-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{activeTooltip.month} Performance</span>
                {stickyBar === activeTooltip && (
                  <button
                    type="button"
                    onClick={() => setStickyBar(null)}
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
              <div className="chart-tooltip-body-grid" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8', fontWeight: '500' }}>Total Purchase:</span>
                  <strong style={{ color: '#34d399', fontSize: '13px' }}>{formatter(activeTooltip.totalPurchase)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8', fontWeight: '500' }}>Purchase Growth:</span>
                  <strong style={{ color: activeTooltip.growthPct >= 0 ? '#34d399' : '#ef4444', fontSize: '13px' }}>
                    {activeTooltip.growthPct > 0 ? '+' : ''}
                    {activeTooltip.growthPct.toFixed(1)}%
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8', fontWeight: '500' }}>Vendor Count:</span>
                  <strong style={{ color: '#f59e0b', fontSize: '13px' }}>{fmtInt(activeTooltip.vendorCount)}</strong>
                </div>
                {activeTooltip.topVendorName && activeTooltip.topVendorName !== 'N/A' && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '6px', paddingTop: '6px' }}>
                    <span style={{ color: '#94a3b8', fontSize: '10px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Top Vendor:</span>
                    <span style={{ color: '#ffffff', fontWeight: '600', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {activeTooltip.topVendorName}
                    </span>
                    <span style={{ color: '#60a5fa', fontSize: '11px', fontWeight: '500' }}>
                      {formatter(activeTooltip.topVendorAmt)}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
          {stickyBar === activeTooltip && (
            <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '4px', textAlign: 'center', fontStyle: 'italic' }}>
              Pinned. Click background to release.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function LineChart({ rows, xKey, series }) {
  const width = 720;
  const height = 280; // slightly taller to comfortably fit values
  const paddingLeft = 70;
  const paddingRight = 30;
  const paddingTop = 45;
  const paddingBottom = 40;

  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [stickyPoint, setStickyPoint] = useState(null);

  const allValues = rows.flatMap((row) => series.map((item) => Number(row[item.key]) || 0));
  const max = Math.max(...allValues, 1000); // safety fallback

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const ticks = [0, max * 0.25, max * 0.5, max * 0.75, max];

  const pointsFor = (key) =>
    rows.map((row, index) => {
      const x = paddingLeft + (index * chartWidth) / Math.max(rows.length - 1, 1);
      const y = height - paddingBottom - ((Number(row[key]) || 0) / max) * chartHeight;
      return { x, y, value: Number(row[key]) || 0, row };
    });

  const getBezierPath = (points) => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) * 0.35;
      const cp1y = p0.y;
      const cp2x = p0.x + (p1.x - p0.x) * 0.65;
      const cp2y = p1.y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const getAreaPath = (points) => {
    if (points.length === 0) return '';
    const curve = getBezierPath(points);
    return `${curve} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;
  };

  const activeTooltip = hoveredPoint || stickyPoint;

  const isDotActive = (seriesKey, index) => {
    if (hoveredPoint && hoveredPoint.seriesKey === seriesKey && hoveredPoint.index === index) return true;
    if (stickyPoint && stickyPoint.seriesKey === seriesKey && stickyPoint.index === index) return true;
    return false;
  };

  return (
    <div className="chart-box" style={{ position: 'relative' }} onClick={() => setStickyPoint(null)}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          {series.map((item) => (
            <linearGradient key={`grad-${item.key}`} id={`grad-${item.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={item.color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={item.color} stopOpacity="0.00" />
            </linearGradient>
          ))}
        </defs>

        {/* Grid lines and Y-axis Labels */}
        {ticks.map((tickVal, idx) => {
          const y = height - paddingBottom - (tickVal / max) * chartHeight;
          return (
            <g key={`grid-line-${idx}`}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
                opacity="0.6"
              />
              <text
                x={paddingLeft - 10}
                y={y + 4}
                textAnchor="end"
                fill="#64748b"
                fontSize="11"
                fontWeight="500"
              >
                {series[0]?.formatter ? series[0].formatter(tickVal) : tickVal}
              </text>
            </g>
          );
        })}

        {/* X-Axis line */}
        <line
          x1={paddingLeft}
          y1={height - paddingBottom}
          x2={width - paddingRight}
          y2={height - paddingBottom}
          stroke="#cbd5e1"
          strokeWidth="1.5"
        />

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

        {/* Interactive Dots and Glow Rings */}
        {series.map((item) => {
          const pts = pointsFor(item.key);
          return pts.map((pt, i) => {
            const active = isDotActive(item.key, i);
            return (
              <g key={`dot-group-${item.key}-${i}`}>
                {/* Glow ring halo */}
                {active && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={13}
                    fill="none"
                    stroke={item.color}
                    strokeWidth={4}
                    opacity={0.25}
                    style={{ pointerEvents: 'none', transition: 'all 0.2s ease' }}
                  />
                )}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={active ? 7 : 4}
                  fill="#ffffff"
                  stroke={item.color}
                  strokeWidth={active ? 4 : 2.5}
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
                      containerWidth: containerRect.width,
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
                      containerWidth: containerRect.width,
                      label: String(pt.row[xKey]),
                      seriesLabel: item.label,
                      valueFormatted: item.formatter ? item.formatter(pt.value) : pt.value,
                      products: item.key === 'previous' ? (pt.row.prevProducts || []) : (pt.row.products || [])
                    });
                  }}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              </g>
            );
          });
        })}

        {/* X-Axis Labels */}
        {rows.map((row, index) => {
          const x = paddingLeft + (index * chartWidth) / Math.max(rows.length - 1, 1);
          return (
            <text key={`${row[xKey]}-${index}`} x={x} y={height - 8} textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="600">
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
            ...getTooltipStyles(activeTooltip, 260, 220),
            borderColor: stickyPoint === activeTooltip ? '#3b82f6' : 'rgba(255, 255, 255, 0.12)',
            borderWidth: stickyPoint === activeTooltip ? '2px' : '1px',
            pointerEvents: stickyPoint === activeTooltip ? 'auto' : 'none'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="chart-tooltip-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{activeTooltip.label} Performance</span>
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
          <div className="chart-tooltip-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#94a3b8', fontWeight: '500' }}>{activeTooltip.seriesLabel}:</span>
            <strong style={{ fontSize: '14px', color: '#34d399' }}>{activeTooltip.valueFormatted}</strong>
          </div>
          {activeTooltip.products && activeTooltip.products.length > 0 && (
            <div className="chart-tooltip-products" style={{ marginTop: '8px' }}>
              <div className="tooltip-section-title" style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700', marginBottom: '4px' }}>
                Top Products:
              </div>
              <ul style={{ margin: 0, paddingLeft: '14px', listStyleType: 'disc', color: '#e2e8f0' }}>
                {activeTooltip.products.slice(0, 3).map((prod, idx) => (
                  <li key={idx} style={{ color: '#f1f5f9', fontWeight: '500', fontSize: '11px', marginBottom: '3px' }}>
                    <span>{prod}</span>
                  </li>
                ))}
                {activeTooltip.products.length > 3 && (
                  <li className="tooltip-more-items" style={{ listStyleType: 'none', marginLeft: '-14px', color: '#94a3b8', fontStyle: 'italic', fontSize: '10px', marginTop: '4px' }}>
                    + {activeTooltip.products.length - 3} remaining count
                  </li>
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

      <div className="legend" style={{ display: 'flex', gap: '16px', padding: '0 18px 16px', color: '#475569', fontSize: '13px', fontWeight: '600' }}>
        {series.map((item) => (
          <span key={item.key} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <i style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: item.color }} />
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
