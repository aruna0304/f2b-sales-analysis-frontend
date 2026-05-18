const API_BASE =
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.BACKEND_URL ||
  'http://localhost:8000';

async function request(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed: ${response.status}`);
  }
  return response.json();
}

export const api = {
  demand: () => request('/data/demand'),
  historical: () => request('/data/historical'),
  vendorSummary: () => request('/vendors/summary'),
  vendorProfit: () => request('/vendors/profit'),
  vendorTrends: () => request('/vendors/trends'),
  vendorProducts: (vendorId) => request(`/vendors/${encodeURIComponent(vendorId)}/products`)
};
