export function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function fmtInt(value) {
  return Math.round(numberValue(value)).toLocaleString('en-IN');
}

export function fmtInr(value) {
  const num = numberValue(value);
  if (num >= 10000000) return `Rs ${Number(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `Rs ${Number(num / 100000).toFixed(2)} L`;
  return `Rs ${Math.round(num).toLocaleString('en-IN')}`;
}

export function fmtPct(value, digits = 1) {
  return `${numberValue(value).toFixed(digits)}%`;
}

export function unique(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null && value !== ''))];
}

export function groupBy(rows, keyFn) {
  return rows.reduce((acc, row) => {
    const key = keyFn(row);
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key).push(row);
    return acc;
  }, new Map());
}

export function sum(rows, key) {
  return rows.reduce((total, row) => total + numberValue(row[key]), 0);
}

export function safeDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function monthLabel(date) {
  return date.toLocaleString('en-US', { month: 'long' });
}
