export const MAX_AIR_READING_AGE_MS = 2 * 60 * 60 * 1000;

export function isCurrentAirReading(recordedAt, now = Date.now()) {
  const observed = Date.parse(recordedAt);
  return Number.isFinite(observed) && observed <= now && now - observed <= MAX_AIR_READING_AGE_MS;
}
