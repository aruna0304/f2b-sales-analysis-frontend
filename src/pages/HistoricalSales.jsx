import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { DataTable, EmptyState, ErrorState, Loader, PageHeader } from '../components/Ui.jsx';
import { groupBy, safeDate, sum, unique } from '../utils/format.js';

function topProducts(rows) {
  const grouped = groupBy(rows, (row) => row.productName || 'Unknown product');
  return [...grouped.entries()]
    .map(([productName, items]) => ({
      productName,
      quantity_sold: sum(items, 'final_quantity'),
      order_count: items.length
    }))
    .sort((a, b) => b.quantity_sold - a.quantity_sold)
    .slice(0, 10);
}

export default function HistoricalSales() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  useEffect(() => {
    api
      .historical()
      .then((data) => {
        const normalized = data.map((row) => ({ ...row, parsedDate: safeDate(row.date) })).filter((row) => row.parsedDate);
        setRows(normalized);
        const latest = normalized.map((row) => row.parsedDate).sort((a, b) => b - a)[0];
        if (latest) {
          setSelectedDate(latest.toISOString().slice(0, 10));
          setSelectedMonth(latest.toISOString().slice(0, 7));
        }
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  const months = useMemo(
    () => unique(rows.map((row) => row.parsedDate.toISOString().slice(0, 7))).sort().reverse(),
    [rows]
  );

  const dailyTop = useMemo(
    () => topProducts(rows.filter((row) => row.parsedDate.toISOString().slice(0, 10) === selectedDate)),
    [rows, selectedDate]
  );

  const monthlyTop = useMemo(
    () => topProducts(rows.filter((row) => row.parsedDate.toISOString().slice(0, 7) === selectedMonth)),
    [rows, selectedMonth]
  );

  if (loading) return <Loader />;
  if (error) return <ErrorState error={error} />;
  if (!rows.length) return <EmptyState title="No historical sales data available from the API" />;

  const columns = [
    { key: 'productName', label: 'Product' },
    { key: 'quantity_sold', label: 'Packets Sold', render: (row) => `${row.quantity_sold} packets` },
    { key: 'order_count', label: 'Orders' }
  ];

  return (
    <div>
      <PageHeader title="Historical Sales" subtitle="View and filter historical performance trends by day or month" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <article className="panel" style={{ margin: 0 }}>
          <div className="panel-title">
            <h2>Daily Sales View</h2>
            <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          </div>
          <h3>Top Products on {selectedDate}</h3>
          <DataTable columns={columns} rows={dailyTop} />
        </article>
        <article className="panel" style={{ margin: 0 }}>
          <div className="panel-title">
            <h2>Monthly Sales View</h2>
            <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
              {months.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>
          <h3>Top Products in {selectedMonth}</h3>
          <DataTable columns={columns} rows={monthlyTop} />
        </article>
      </div>
    </div>
  );
}
