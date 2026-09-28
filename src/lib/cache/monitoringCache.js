// Client-side in-memory cache for Monitoring dashboards
// Allows instant (0ms) render when switching between tabs without waiting for network re-fetch.

const cache = {
  weatherData: null,
  airData: null,
  heatData: null,
  seismicData: null,
  hazardTelemetry: null,
  lastFetch: {}
};

export function getCachedMonitoringData(key) {
  return cache[key] || null;
}

export function setCachedMonitoringData(key, data) {
  cache[key] = data;
  cache.lastFetch[key] = Date.now();
}

export function isCacheStale(key, ttlMs = 120000) {
  if (!cache[key]) return true;
  const last = cache.lastFetch[key] || 0;
  return Date.now() - last > ttlMs;
}
