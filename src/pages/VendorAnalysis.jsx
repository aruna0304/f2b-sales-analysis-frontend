import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import {
  BarList,
  ColumnChart,
  DataTable,
  DonutChart,
  EmptyState,
  ErrorState,
  LineChart,
  Loader,
  MetricCard,
  PillSelect,
  PageHeader
} from '../components/Ui.jsx';
import { fmtInr, fmtInt, fmtPct, groupBy, numberValue, sum, unique } from '../utils/format.js';

const tabs = ['Executive Overview', 'Profit Analysis', 'Vendor Drill-Down'];

function sortByValue(rows, key, desc = true) {
  return [...rows].sort((a, b) => (desc ? numberValue(b[key]) - numberValue(a[key]) : numberValue(a[key]) - numberValue(b[key])));
}

export default function VendorAnalysis() {
  const [purchaseRows, setPurchaseRows] = useState([]);
  const [profitRows, setProfitRows] = useState([]);
  const [trendRows, setTrendRows] = useState([]);
  const [productRows, setProductRows] = useState([]);
  const [tab, setTab] = useState(tabs[0]);
  const [rankBy, setRankBy] = useState('estimatedProfit');
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadAll = () => {
    setLoading(true);
    Promise.all([api.vendorSummary(), api.vendorProfit(), api.vendorTrends()])
      .then(([summary, profit, trends]) => {
        setPurchaseRows(summary);
        setProfitRows(profit);
        setTrendRows(trends);
        const firstVendor = summary[0]?.vendorId || '';
        setSelectedVendorId((current) => current || firstVendor);
        const months = unique(trends.map((row) => row.monthStr)).sort();
        setSelectedMonths(months);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  };

  useEffect(loadAll, []);

  useEffect(() => {
    if (!selectedVendorId) return;
    setProductsLoading(true);
    api
      .vendorProducts(selectedVendorId)
      .then((rows) => setProductRows(sortByValue(rows, 'estimatedProfit')))
      .catch(() => setProductRows([]))
      .finally(() => setProductsLoading(false));
  }, [selectedVendorId]);

  const selectedVendor = purchaseRows.find((row) => row.vendorId === selectedVendorId);
  const selectedProfit = profitRows.find((row) => row.vendorId === selectedVendorId);
  const filteredTrends = trendRows.filter((row) => !selectedMonths.length || selectedMonths.includes(row.monthStr));

  const monthlyTotals = useMemo(() => {
    const grouped = groupBy(filteredTrends, (row) => row.monthStr);
    return [...grouped.entries()]
      .map(([monthStr, rows]) => ({
        monthStr,
        totalPurchaseAmt: sum(rows, 'totalPurchaseAmt'),
        products: Array.from(new Set(rows.flatMap((r) => r.products || [])))
      }))
      .sort((a, b) => String(a.monthStr).localeCompare(String(b.monthStr)));
  }, [filteredTrends]);

  const totalVendors = unique(purchaseRows.map((row) => row.vendorId)).length;
  const totalPurchase = sum(purchaseRows, 'totalPurchaseAmt');
  const totalRevenue = sum(profitRows, 'totalRevenue');
  const totalProfit = sum(profitRows, 'estimatedProfit');
  const avgMargin = profitRows.length ? sum(profitRows, 'profitMarginPct') / profitRows.length : 0;
  const anomalies = sum(profitRows, 'anomalyCount');

  if (loading) return <Loader label="Fetching vendor data..." />;
  if (error) return <ErrorState error={error} />;
  if (!purchaseRows.length && !profitRows.length) return <EmptyState title="No vendor data found" detail="Check the backend vendor endpoints and MongoDB collections." />;

  return (
    <div>
      <PageHeader
        title="Vendor Sales & Profit Analysis"
        subtitle="Executive analytics on vendor performance, purchase volumes, and profitability"
        action={<button type="button" className="primary" onClick={loadAll}>Refresh Data</button>}
      />

      <section className="metric-grid five">
        <MetricCard label="Total Vendors" value={fmtInt(totalVendors)} />
        <MetricCard label="Total Purchase Volume" value={fmtInr(totalPurchase)} tone="violet" />
        <MetricCard label="Total Revenue Generated" value={fmtInr(totalRevenue)} tone="amber" />
        <MetricCard label="Estimated Profit" value={fmtInr(totalProfit)} tone="green" />
        <MetricCard label="Avg Profit Margin" value={fmtPct(avgMargin)} />
      </section>

      {anomalies > 0 ? (
        <div className="warning">Data Integrity Alert: Found {fmtInt(anomalies)} line items with suspicious profit margins.</div>
      ) : null}

      <div className="tabs">
        {tabs.map((item) => (
          <button key={item} className={item === tab ? 'active' : ''} onClick={() => setTab(item)} type="button">
            {item}
          </button>
        ))}
      </div>

      {tab === 'Executive Overview' ? (
        <ExecutiveOverview
          purchaseRows={purchaseRows}
          trendRows={trendRows}
          monthlyTotals={monthlyTotals}
          selectedMonths={selectedMonths}
          setSelectedMonths={setSelectedMonths}
        />
      ) : null}

      {tab === 'Profit Analysis' ? (
        <ProfitAnalysis profitRows={profitRows} rankBy={rankBy} setRankBy={setRankBy} filteredTrends={filteredTrends} />
      ) : null}

      {tab === 'Vendor Drill-Down' ? (
        <VendorDrillDown
          purchaseRows={purchaseRows}
          selectedVendorId={selectedVendorId}
          setSelectedVendorId={setSelectedVendorId}
          selectedVendor={selectedVendor}
          selectedProfit={selectedProfit}
          productRows={productRows}
          productsLoading={productsLoading}
        />
      ) : null}
    </div>
  );
}

function ExecutiveOverview({ purchaseRows, trendRows, monthlyTotals, selectedMonths, setSelectedMonths }) {
  const months = unique(trendRows.map((row) => row.monthStr)).sort();
  const topVendors = sortByValue(purchaseRows, 'totalPurchaseAmt').slice(0, 10);
  const topFiveNames = topVendors.slice(0, 5).map((row) => row.vendorName);
  const topFiveTrend = trendRows.filter((row) => selectedMonths.includes(row.monthStr) && topFiveNames.includes(row.vendorName));
  const stackedRows = unique(topFiveTrend.map((row) => row.monthStr))
    .sort()
    .map((monthStr) => {
      const monthRows = topFiveTrend.filter((row) => row.monthStr === monthStr);
      return { monthStr, totalPurchaseAmt: sum(monthRows, 'totalPurchaseAmt') };
    });

  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h2>Monthly Purchase Trend</h2>
          <p>Purchase growth performance over time</p>
        </div>
        <PillSelect label="Filter Months" options={months} value={selectedMonths} onChange={setSelectedMonths} />
      </div>
      {monthlyTotals.length === 1 ? (
        <div className="single-month">
          <span>Performance for {monthlyTotals[0].monthStr}</span>
          <strong>{fmtInr(monthlyTotals[0].totalPurchaseAmt)}</strong>
        </div>
      ) : (
        <LineChart rows={monthlyTotals} xKey="monthStr" series={[{ key: 'totalPurchaseAmt', label: 'Total Purchases', color: '#2563eb', formatter: fmtInr }]} />
      )}

      <div className="split-grid">
        <article>
          <h2>Top Vendors by Purchase Volume</h2>
          <BarList rows={topVendors} labelKey="vendorName" valueKey="totalPurchaseAmt" formatter={fmtInr} />
        </article>
        <article>
          <h2>Purchase Share</h2>
          <DonutChart rows={topVendors} labelKey="vendorName" valueKey="totalPurchaseAmt" formatter={fmtInr} centerLabel="Purchase" />
        </article>
      </div>
      <div className="panel">
        <h2>Monthly Comparison (Top 5)</h2>
        <ColumnChart rows={stackedRows} labelKey="monthStr" valueKey="totalPurchaseAmt" formatter={fmtInr} color="#7c3aed" />
      </div>
    </section>
  );
}

function ProfitAnalysis({ profitRows, rankBy, setRankBy, filteredTrends = [] }) {
  const labels = {
    estimatedProfit: 'Estimated Profit',
    totalRevenue: 'Total Revenue',
    profitMarginPct: 'Profit Margin %'
  };
  const ranked = sortByValue(profitRows, rankBy).slice(0, 15);
  const tableRows = sortByValue(profitRows, 'estimatedProfit');

  const monthlyProfits = useMemo(() => {
    const grouped = groupBy(filteredTrends, (row) => row.monthStr);
    return [...grouped.entries()]
      .map(([monthStr, rows]) => ({
        monthStr,
        estimatedProfit: sum(rows, 'estimatedProfit'),
        products: Array.from(new Set(rows.flatMap((r) => r.products || [])))
      }))
      .sort((a, b) => String(a.monthStr).localeCompare(String(b.monthStr)));
  }, [filteredTrends]);

  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h2>Top Vendors: {labels[rankBy]}</h2>
          <p>Profitability and revenue performance ranking</p>
        </div>
        <select value={rankBy} onChange={(event) => setRankBy(event.target.value)}>
          {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <BarList rows={ranked} labelKey="vendorName" valueKey={rankBy} formatter={rankBy === 'profitMarginPct' ? fmtPct : fmtInr} limit={15} />

      {monthlyProfits.length > 0 && (
        <div style={{ marginTop: '36px', marginBottom: '36px' }}>
          <h2>Monthly Profit Trend</h2>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#6b7280' }}>
            Estimated gross profit curve across all vendors. Hover data points to see the product details breakdown.
          </p>
          {monthlyProfits.length === 1 ? (
            <div className="single-month">
              <span>Profit for {monthlyProfits[0].monthStr}</span>
              <strong>{fmtInr(monthlyProfits[0].estimatedProfit)}</strong>
            </div>
          ) : (
            <LineChart rows={monthlyProfits} xKey="monthStr" series={[{ key: 'estimatedProfit', label: 'Monthly Profit', color: '#10b981', formatter: fmtInr }]} />
          )}
        </div>
      )}

      <h2>Profit Summary Table</h2>
      <DataTable
        rows={tableRows}
        columns={[
          { key: 'vendorName', label: 'Vendor Name' },
          { key: 'totalQuantity', label: 'Quantity Purchased', render: (row) => fmtInt(row.totalQuantity) },
          { key: 'totalPurchaseAmt', label: 'Total Purchase Cost', render: (row) => fmtInr(row.totalPurchaseAmt) },
          { key: 'totalGST', label: 'GST Paid', render: (row) => fmtInr(row.totalGST) },
          { key: 'totalRevenue', label: 'Estimated Revenue', render: (row) => fmtInr(row.totalRevenue) },
          { key: 'estimatedProfit', label: 'Estimated Gross Profit', render: (row) => fmtInr(row.estimatedProfit) },
          { key: 'profitMarginPct', label: 'Gross Profit Margin %', render: (row) => fmtPct(row.profitMarginPct) },
          { key: 'transactionCount', label: 'Transaction Count', render: (row) => fmtInt(row.transactionCount) }
        ]}
      />
    </section>
  );
}

function VendorDrillDown({ purchaseRows, selectedVendorId, setSelectedVendorId, selectedVendor, selectedProfit, productRows, productsLoading }) {
  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h2>Vendor Drill-Down</h2>
          <p>Product catalog and profitability for a selected vendor</p>
        </div>
        <select value={selectedVendorId} onChange={(event) => setSelectedVendorId(event.target.value)}>
          {purchaseRows
            .slice()
            .sort((a, b) => String(a.vendorName).localeCompare(String(b.vendorName)))
            .map((vendor) => (
              <option key={vendor.vendorId} value={vendor.vendorId}>{vendor.vendorName}</option>
            ))}
        </select>
      </div>

      {selectedVendor ? (
        <>
          <section className="metric-grid four">
            <MetricCard label="Contact" value={selectedVendor.contactNumber || 'N/A'} />
            <MetricCard label="Location" value={selectedVendor.location || 'N/A'} tone="violet" />
            <MetricCard label="Total Spent" value={fmtInr(selectedVendor.totalPurchaseAmt)} tone="green" />
            <MetricCard label="Unique SKUs" value={fmtInt(selectedVendor.uniqueProductCount)} tone="amber" />
          </section>
          <section className="metric-grid four">
            <MetricCard label="GST Paid" value={fmtInr(selectedVendor.totalGST)} />
            <MetricCard label="Revenue" value={fmtInr(selectedProfit?.totalRevenue)} tone="green" />
            <MetricCard label="Est. Profit" value={fmtInr(selectedProfit?.estimatedProfit)} delta={`${fmtPct(selectedProfit?.profitMarginPct)} margin`} />
            <MetricCard label="Transactions" value={fmtInt(selectedVendor.transactionCount)} tone="violet" />
          </section>
        </>
      ) : null}

      <h2>Product Catalog for {selectedVendor?.vendorName || 'Vendor'}</h2>
      {productsLoading ? <Loader label="Loading product details..." /> : null}
      {!productsLoading && productRows.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', marginTop: '24px' }}>
          <div className="split-grid" style={{ margin: 0 }}>
            <article className="panel" style={{ margin: 0 }}>
              <h2>Profit per Product</h2>
              <BarList rows={productRows} labelKey="productName" valueKey="estimatedProfit" formatter={fmtInr} limit={15} />
            </article>
            <article className="panel" style={{ margin: 0 }}>
              <h2>Revenue Share</h2>
              <DonutChart rows={productRows} labelKey="productName" valueKey="totalRevenue" formatter={fmtInr} centerLabel="Revenue" />
            </article>
          </div>

          <article className="panel" style={{ margin: 0 }}>
            <h2>Purchase Cost by Product</h2>
            <ColumnChart rows={productRows.slice(0, 8)} labelKey="productName" valueKey="totalPurchaseCost" formatter={fmtInr} color="#f59e0b" />
          </article>

          <article className="panel" style={{ margin: 0 }}>
            <h2>Product Details Table</h2>
            <DataTable
              rows={productRows}
              maxRows={15}
              columns={[
                { key: 'productName', label: 'Product Name' },
                { key: 'totalQuantity', label: 'Quantity Purchased', render: (row) => fmtInt(row.totalQuantity) },
                { key: 'totalPurchaseCost', label: 'Total Purchase Cost', render: (row) => fmtInr(row.totalPurchaseCost || row.totalPurchaseAmt) },
                { key: 'totalGST', label: 'GST Paid', render: (row) => fmtInr(row.totalGST) },
                { key: 'sellingPricePerUnit', label: 'Average Unit Selling Price', render: (row) => fmtInr(row.sellingPricePerUnit || row.avgSellingPrice) },
                { key: 'profitPercentage', label: 'Gross Profit Margin %', render: (row) => fmtPct(row.profitPercentage) },
                { key: 'totalRevenue', label: 'Estimated Revenue', render: (row) => fmtInr(row.totalRevenue) },
                { key: 'estimatedProfit', label: 'Estimated Gross Profit', render: (row) => fmtInr(row.estimatedProfit) }
              ]}
            />
          </article>
        </div>
      ) : null}
      {!productsLoading && !productRows.length ? <EmptyState title="No product details available for this vendor" /> : null}
    </section>
  );
}
