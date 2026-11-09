// Fetch the newest observation for every municipality, including those absent
// from the newest global batch.
export async function getLatestWeatherTelemetry(db, municipalities, batchSize = 200) {
  const { data, error } = await db.from('weather_telemetry')
    .select('*').order('fetched_at', { ascending: false }).limit(batchSize);
  if (error) throw error;

  const latest = new Map();
  for (const row of data || []) {
    if (!latest.has(row.municipality_id)) latest.set(row.municipality_id, row);
  }

  const missing = municipalities.map(m => m.municipality_id || m.id)
    .filter(id => id && !latest.has(id));
  for (let index = 0; index < missing.length; index += 10) {
    const results = await Promise.all(missing.slice(index, index + 10).map(id =>
      db.from('weather_telemetry').select('*').eq('municipality_id', id)
        .order('fetched_at', { ascending: false }).limit(1)));
    for (const result of results) {
      if (result.error) throw result.error;
      if (result.data?.[0]) latest.set(result.data[0].municipality_id, result.data[0]);
    }
  }
  return latest;
}
