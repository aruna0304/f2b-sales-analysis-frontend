const API_BASE =
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.BACKEND_URL ||
  'http://localhost:8000';

const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

async function request(endpoint, forceRefresh = false) {
  const cached = cache.get(endpoint);
  const now = Date.now();

  if (!forceRefresh && cached && (now - cached.timestamp < CACHE_DURATION)) {
    return cached.data;
  }

  const response = await fetch(`${API_BASE}${endpoint}`);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed: ${response.status}`);
  }
  const data = await response.json();
  cache.set(endpoint, { data, timestamp: now });
  return data;
}

export const api = {
  clearCache: () => cache.clear(),
  clearBackendCache: async () => {
    cache.clear();
    try {
      await fetch(`${API_BASE}/cache/clear`, { method: 'POST' });
    } catch (err) {
      console.warn("Could not clear backend cache:", err);
    }
  },
  demand: (force = false) => request('/data/demand', force),
  historical: (force = false) => request('/data/historical', force),
  wastage: (force = false) => request('/data/wastage', force),
  vendorSummary: (force = false) => request('/vendors/summary', force),
  vendorProfit: (force = false) => request('/vendors/profit', force),
  vendorTrends: (force = false) => request('/vendors/trends', force),
  vendorProducts: (vendorId, force = false) => request(`/vendors/${encodeURIComponent(vendorId)}/products`, force)
};
