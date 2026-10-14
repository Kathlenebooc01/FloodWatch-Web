// Page through newest rows until every requested municipality has a reading.
// A busy municipality cannot hide another municipality behind a fixed limit.
export async function getLatestAirQuality(db, municipalities) {
  const ids = new Set(municipalities.map((m) => m.municipality_id || m.id).filter(Boolean).map(String));
  if (!ids.size) return [];
  const selected = new Map();
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await db.from('air_quality').select('*')
      .order('recorded_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error('Cannot read air quality: ' + error.message);
    for (const row of data || []) {
      const id = String(row.municipality_id);
      if (ids.has(id) && !selected.has(id)) selected.set(id, row);
    }
    if (!data || data.length < pageSize || selected.size === ids.size) break;
  }
  return [...selected.values()];
}

// The user-selected September 12 observation batch covers all 54 municipalities.
// Select the newest row within that batch; AQI and pollutants stay on one row.
export async function getSelectedAirQuality(db, municipalities) {
  const ids = new Set(municipalities.map((m) => m.municipality_id || m.id).filter(Boolean).map(String));
  if (!ids.size) return [];
  const selected = new Map();
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await db.from('air_quality').select('*')
      .gte('recorded_at', '2026-09-12T23:35:00+00:00')
      .lt('recorded_at', '2026-09-12T23:36:00+00:00')
      .order('recorded_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error('Cannot read air quality: ' + error.message);
    for (const row of data || []) {
      const id = String(row.municipality_id);
      if (ids.has(id) && !selected.has(id)) selected.set(id, row);
    }
    if (!data || data.length < pageSize) break;
  }
  return [...selected.values()];
}
