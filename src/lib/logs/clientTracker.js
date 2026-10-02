"use client";

// Simple in-memory cache to prevent duplicate rapid spamming while still logging genuine page loads & events
const lastTrackTimes = {};

/**
 * Tracks an API usage event to the backend database in realtime.
 * Throttled to max once per intervalMs per unique key (default 20 seconds).
 */
export async function trackApiUsage({
  apiType = 'mapbox',
  eventType = 'Execution',
  message = '',
  isError = false,
  throttleKey = null,
  throttleMs = 20000
}) {
  const key = throttleKey || `${apiType}:${eventType}:${message.slice(0, 30)}`;
  const now = Date.now();

  if (!isError && lastTrackTimes[key] && now - lastTrackTimes[key] < throttleMs) {
    return; // Throttled to avoid overwhelming the activity logs on component re-renders
  }
  lastTrackTimes[key] = now;

  try {
    if (typeof window === 'undefined') return;
    await fetch('/api/logs/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiType,
        eventType,
        message,
        isError
      })
    });
  } catch (err) {
    // Non-blocking background log
    console.debug('Failed to send api log tracking:', err);
  }
}
