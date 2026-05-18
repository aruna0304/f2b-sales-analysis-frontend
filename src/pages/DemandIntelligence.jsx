import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import {
  BarList,
  ColumnChart,
  DataTable,
  EmptyState,
  ErrorState,
  LineChart,
  Loader,
  MetricCard,
  PillSelect,
  PageHeader
} from '../components/Ui.jsx';
import { fmtInt, groupBy, monthLabel, numberValue, safeDate, sum, unique } from '../utils/format.js';

function enrichSales(rows) {
  return rows
    .map((row) => {
      const parsedDate = safeDate(row.date);
      if (!parsedDate) return null;
      return {
        ...row,
        parsedDate,
        year: parsedDate.getFullYear(),
        month: monthLabel(parsedDate),
        monthNum: parsedDate.getMonth() + 1,
        week: Math.floor((parsedDate.getDate() - 1) / 7) + 1
      };
    })
    .filter(Boolean);
}

export default function DemandIntelligence() {
  const [demandRows, setDemandRows] = useState([]);
  const [salesRows, setSalesRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [demandFilter, setDemandFilter] = useState([]);
  const [activityFilter, setActivityFilter] = useState([]);
  const [trendFilter, setTrendFilter] = useState([]);
  const [comparePrev, setComparePrev] = useState(false);
  const [metricType, setMetricType] = useState('Sales Volume');

  useEffect(() => {
    Promise.all([api.demand(), api.historical()])
      .then(([demand, historical]) => {
        const seen = new Set();
        setDemandRows(
          demand.filter((row) => {
            if (!row.productName || seen.has(row.productName)) return false;
            seen.add(row.productName);
            return true;
          })
        );
        setSalesRows(enrichSales(historical));
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return demandRows.filter((row) => {
      const demandOk = !demandFilter.length || demandFilter.includes(row.demand_level);
      const activityOk = !activityFilter.length || activityFilter.includes(row.activity);
      const trendOk = !trendFilter.length || trendFilter.includes(row.trend);
      return demandOk && activityOk && trendOk;
    });
  }, [demandRows, demandFilter, activityFilter, trendFilter]);

  const latestSale = useMemo(
    () => salesRows.map((row) => row.parsedDate).sort((a, b) => b - a)[0],
    [salesRows]
  );
  const defaultYear = latestSale?.getFullYear();
  const defaultMonth = latestSale ? monthLabel(latestSale) : '';
  const defaultWeek = latestSale ? Math.floor((latestSale.getDate() - 1) / 7) + 1 : 1;
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');

  useEffect(() => {
    if (defaultYear && !selectedYear) setSelectedYear(String(defaultYear));
    if (defaultMonth && !selectedMonth) setSelectedMonth(defaultMonth);
    if (defaultWeek && !selectedWeek) setSelectedWeek(String(defaultWeek));
  }, [defaultYear, defaultMonth, defaultWeek, selectedYear, selectedMonth, selectedWeek]);

  const years = unique(salesRows.map((row) => String(row.year))).sort((a, b) => Number(b) - Number(a));
  const months = unique(salesRows.filter((row) => String(row.year) === selectedYear).map((row) => row.month));
  const weeks = unique(
    salesRows
      .filter((row) => String(row.year) === selectedYear && row.month === selectedMonth)
      .map((row) => String(row.week))
  ).sort((a, b) => Number(a) - Number(b));

  const weeklyTrend = useMemo(() => {
    const monthlyRows = salesRows.filter((row) => String(row.year) === selectedYear && row.month === selectedMonth);
    const grouped = groupBy(monthlyRows, (row) => row.week);
    return [...grouped.entries()]
      .map(([week, rows]) => ({
        week,
        label: `Week ${week}`,
        current:
          metricType === 'Sales Volume'
            ? sum(rows, 'final_quantity')
            : unique(rows.map((row) => row.productId)).length,
        products: Array.from(new Set(rows.map((row) => row.productName || 'Unknown Product').filter(Boolean)))
      }))
      .sort((a, b) => Number(a.week) - Number(b.week));
  }, [salesRows, selectedYear, selectedMonth, metricType]);

  const prevRows = useMemo(() => {
    const current = salesRows.find((row) => String(row.year) === selectedYear && row.month === selectedMonth);
    if (!current) return [];
    const prevMonthNum = current.monthNum === 1 ? 12 : current.monthNum - 1;
    const prevYear = current.monthNum === 1 ? Number(selectedYear) - 1 : Number(selectedYear);
    return salesRows.filter((row) => row.year === prevYear && row.monthNum === prevMonthNum);
  }, [salesRows, selectedYear, selectedMonth]);

  const weeklyChartRows = useMemo(() => {
    const prevGrouped = groupBy(prevRows, (row) => row.week);
    return weeklyTrend.map((row) => {
      const previous = prevGrouped.get(row.week) || [];
      return {
        ...row,
        previous:
          metricType === 'Sales Volume'
            ? sum(previous, 'final_quantity')
            : unique(previous.map((item) => item.productId)).length,
        prevProducts: Array.from(new Set(previous.map((item) => item.productName || 'Unknown Product').filter(Boolean)))
      };
    });
  }, [weeklyTrend, prevRows, metricType]);

  const dayTypeRows = useMemo(() => {
    const weekRows = salesRows.filter(
      (row) =>
        String(row.year) === selectedYear &&
        row.month === selectedMonth &&
        String(row.week) === selectedWeek
    );
    const weekdayTotal = weekRows
      .filter((row) => row.parsedDate.getDay() > 0 && row.parsedDate.getDay() < 6)
      .reduce((total, row) => total + numberValue(row.final_quantity), 0);
    const weekendTotal = weekRows
      .filter((row) => row.parsedDate.getDay() === 0 || row.parsedDate.getDay() === 6)
      .reduce((total, row) => total + numberValue(row.final_quantity), 0);
    return [
      { label: 'Weekday Avg/Day', value: weekdayTotal / 5 },
      { label: 'Weekend Avg/Day', value: weekendTotal / 2 }
    ];
  }, [salesRows, selectedYear, selectedMonth, selectedWeek]);

  if (loading) return <Loader />;
  if (error) return <ErrorState error={error} />;
  if (!demandRows.length) return <EmptyState title="No demand data available from the API" />;

  const priorityRows = [...filtered].sort((a, b) => numberValue(b.priority_score) - numberValue(a.priority_score));
  const peak = [...weeklyTrend].sort((a, b) => b.current - a.current)[0];
  const low = [...weeklyTrend].sort((a, b) => a.current - b.current)[0];
  const currTotal = weeklyTrend.reduce((total, row) => total + row.current, 0);
  const prevTotal =
    metricType === 'Sales Volume' ? sum(prevRows, 'final_quantity') : unique(prevRows.map((row) => row.productId)).length;
  const growth = prevTotal > 0 ? Math.max(-100, Math.min(100, ((currTotal - prevTotal) / prevTotal) * 100)) : currTotal ? 100 : 0;

  return (
    <div>
      <PageHeader title="Demand Intelligence" subtitle="Smart product demand insights for decision making" />
      <section className="metric-grid four">
        <MetricCard label="Priority Products" value={fmtInt(demandRows.filter((row) => numberValue(row.priority_score) > 1).length)} />
        <MetricCard label="Active Products" value={fmtInt(demandRows.filter((row) => row.activity === 'ACTIVE').length)} tone="green" />
        <MetricCard label="No Demand" value={fmtInt(demandRows.filter((row) => row.demand_level === 'NO DEMAND').length)} tone="amber" />
        <MetricCard label="Total Products" value={fmtInt(demandRows.length)} tone="violet" />
      </section>

      <section className="panel">
        <h2>Quick Filters</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <PillSelect label="Demand Level" options={unique(demandRows.map((row) => row.demand_level))} value={demandFilter} onChange={setDemandFilter} />
          <PillSelect label="Activity" options={unique(demandRows.map((row) => row.activity))} value={activityFilter} onChange={setActivityFilter} />
          <PillSelect label="Trend" options={unique(demandRows.map((row) => row.trend))} value={trendFilter} onChange={setTrendFilter} />
        </div>
      </section>

      <section className="split-grid">
        <article className="panel">
          <h2>Top Priority Products</h2>
          <DataTable
            rows={priorityRows}
            maxRows={12}
            columns={[
              { key: 'productName', label: 'Product Name' },
              {
                key: 'priority_visual',
                label: 'Priority Visual Indicator',
                render: (row) => {
                  const score = Number(row.priority_score) || 0;
                  const percentage = Math.min(100, Math.max(0, (score / 8) * 100)); // Priority score max is 8

                  return (
                    <div style={{ display: 'flex', alignItems: 'center', minWidth: '160px', padding: '4px 0' }}>
                      <div style={{
                        flex: 1,
                        height: '10px',
                        background: '#e5e7eb',
                        borderRadius: '9999px',
                        overflow: 'hidden',
                        boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)',
                        position: 'relative'
                      }}>
                        <div style={{
                          width: `${percentage}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #2563eb 0%, #06b6d4 45%, #10b981 100%)',
                          borderRadius: '9999px',
                          boxShadow: '0 0 8px rgba(6, 182, 212, 0.5)',
                          transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                        }} />
                      </div>
                    </div>
                  );
                }
              },
              { key: 'priority_score', label: 'Priority Score', render: (row) => Number(row.priority_score).toFixed(2) }
            ]}
          />
        </article>
        <article className="panel">
          <h2>All Products</h2>
          <DataTable
            rows={filtered}
            maxRows={12}
            columns={[
              { key: 'productName', label: 'Product Name' },
              { key: 'will_sell', label: 'Will Sell' },
              { key: 'demand_level', label: 'Demand Level' },
              { key: 'activity', label: 'Activity' },
              { key: 'trend', label: 'Trend' }
            ]}
          />
        </article>
      </section>

      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Weekly Demand Distribution</h2>
            <p>Monthly weekly trend, peak and low weeks, and weekday/weekend pattern.</p>
          </div>
          <div className="inline-controls">
            <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}>
              {years.map((year) => <option key={year}>{year}</option>)}
            </select>
            <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
              {months.map((month) => <option key={month}>{month}</option>)}
            </select>
            <select value={selectedWeek} onChange={(event) => setSelectedWeek(event.target.value)}>
              {weeks.map((week) => <option key={week}>{week}</option>)}
            </select>
          </div>
        </div>
        <div className="segmented">
          <label><input type="checkbox" checked={comparePrev} onChange={(event) => setComparePrev(event.target.checked)} /> Compare previous month</label>
          <button className={metricType === 'Sales Volume' ? 'active' : ''} onClick={() => setMetricType('Sales Volume')} type="button">Sales Volume</button>
          <button className={metricType !== 'Sales Volume' ? 'active' : ''} onClick={() => setMetricType('Unique Products Sold')} type="button">Unique Products Sold</button>
        </div>
        <div className="metric-grid three">
          <MetricCard label="Peak Week" value={peak?.label || 'N/A'} delta={peak ? fmtInt(peak.current) : ''} />
          <MetricCard label="Lowest Week" value={low?.label || 'N/A'} delta={low ? fmtInt(low.current) : ''} tone="amber" />
          <MetricCard label="MoM Growth" value={`${growth.toFixed(1)}%`} delta="vs previous month" tone="green" />
        </div>
        <div className="split-grid">
          <article>
            <h2>Monthly Weekly Trends</h2>
            <LineChart
              rows={weeklyChartRows}
              xKey="label"
              series={[
                { key: 'current', label: `Current (${selectedMonth})`, color: '#2563eb' },
                ...(comparePrev ? [{ key: 'previous', label: 'Previous month', color: '#10b981' }] : [])
              ]}
            />
          </article>
          <article>
            <h2>Weekday vs Weekend Demand</h2>
            <ColumnChart rows={dayTypeRows} labelKey="label" valueKey="value" formatter={(value) => value.toFixed(1)} color="#10b981" />
          </article>
        </div>
      </section>
    </div>
  );
}
