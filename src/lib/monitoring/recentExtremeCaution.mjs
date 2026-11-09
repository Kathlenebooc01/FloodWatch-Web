const LOOKBACK_DAYS = 7;

export async function getRecentExtremeCaution(db, now = Date.now()) {
  const cutoff = new Date(now - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const latest = new Map();
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await db.from('weather_telemetry')
      .select('municipality_id,heat_index,fetched_at')
      .gte('fetched_at', cutoff).gte('heat_index', 33).lt('heat_index', 42)
      .order('fetched_at', { ascending: false }).range(offset, offset + pageSize - 1);
    if (error) throw error;
    for (const row of data || []) {
      if (!latest.has(row.municipality_id)) latest.set(row.municipality_id, row);
    }
    if (!data || data.length < pageSize) return latest;
  }
}
