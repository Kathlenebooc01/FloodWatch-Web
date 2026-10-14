// OpenAQ access is server-only. This verified sensor covers Lapu-Lapu City.
export const STATION = { id: 6455462, sensorId: 17002975, name: 'Lapu-Lapu City', provider: 'Clarity' };
export const SOURCE_TAG = 'OpenAQ:6455462;Clarity;PM2.5 NowCast';
const HOUR = 3600000;
const BANDS = [[0, 9, 0, 50], [9.1, 35.4, 51, 100], [35.5, 55.4, 101, 150], [55.5, 125.4, 151, 200], [125.5, 225.4, 201, 300], [225.5, 325.4, 301, 500]];

export function pm25Aqi(value) {
  if (!Number.isFinite(value) || value < 0) return null;
  const concentration = Math.floor(value * 10 + 1e-8) / 10;
  const [low, high, indexLow, indexHigh] = BANDS.find(b => concentration <= b[1]) || BANDS.at(-1);
  return Math.round((indexHigh - indexLow) / (high - low) * (concentration - low) + indexLow);
}

export function calculateNowCast(rows, now = Date.now()) {
  const end = Math.floor(now / HOUR) * HOUR;
  const bins = new Map();
  for (const row of rows) {
    const timestamp = Date.parse(row.period?.datetimeTo?.utc);
    const age = (end - timestamp) / HOUR;
    if (Number.isInteger(age) && age >= 0 && age < 12 && typeof row.value === 'number' && row.value >= 0 && Number.isFinite(row.value)
      && row.parameter?.name === 'pm25' && row.parameter?.units === 'µg/m³' && !row.flagInfo?.hasFlags) bins.set(age, row.value);
  }
  if ([0, 1, 2].filter(age => bins.has(age)).length < 2) return null;
  const values = [...bins.values()];
  const max = Math.max(...values);
  const weight = max === 0 ? 1 : Math.max(0.5, Math.min(...values) / max);
  let numerator = 0, denominator = 0;
  for (const [age, value] of bins) { numerator += value * weight ** age; denominator += weight ** age; }
  const concentration = Math.floor(numerator / denominator * 10 + 1e-8) / 10;
  return { aqi: pm25Aqi(concentration), concentration, recordedAt: new Date(end - Math.min(...bins.keys()) * HOUR).toISOString() };
}

export function aqiStatus(aqi) {
  return aqi <= 50 ? 'Good' : aqi <= 100 ? 'Moderate' : aqi <= 150 ? 'Unhealthy for Sensitive Groups' : aqi <= 200 ? 'Unhealthy' : aqi <= 300 ? 'Very Unhealthy' : 'Hazardous';
}

async function api(path, key, fetcher) {
  const response = await fetcher('https://api.openaq.org/v3/' + path, { headers: { 'X-API-Key': key }, cache: 'no-store', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('OpenAQ request failed (HTTP ' + response.status + ')');
  const json = await response.json();
  if (!Array.isArray(json.results)) throw new Error('Invalid OpenAQ response');
  return json.results;
}

export async function fetchOpenAqReading(key, { now = Date.now(), fetcher = fetch } = {}) {
  const end = Math.floor(now / HOUR) * HOUR;
  const [latest, hours] = await Promise.all([
    api('locations/' + STATION.id + '/latest', key, fetcher),
    api('sensors/' + STATION.sensorId + '/hours?datetime_from=' + encodeURIComponent(new Date(end - 12 * HOUR).toISOString()) + '&datetime_to=' + encodeURIComponent(new Date(end).toISOString()) + '&limit=100', key, fetcher),
  ]);
  const measurement = latest.find(item => item.sensorsId === STATION.sensorId && item.locationsId === STATION.id);
  const observed = Date.parse(measurement?.datetime?.utc);
  if (!measurement || typeof measurement.value !== 'number' || !Number.isFinite(measurement.value) || measurement.value < 0
    || !Number.isFinite(observed) || observed > now + 60000 || now - observed > 2 * HOUR) throw new Error('OpenAQ station has no recent valid PM2.5 reading');
  const nowCast = calculateNowCast(hours, now);
  if (!nowCast) throw new Error('Not enough recent hourly data to calculate PM2.5 NowCast AQI');
  return { aqi: nowCast.aqi, pm2_5: measurement.value, recorded_at: new Date(observed).toISOString(),
    status: aqiStatus(nowCast.aqi) + ' | ' + SOURCE_TAG, dominant_pollutant: 'PM2.5',
    air_source: 'OpenAQ / Clarity', air_station: STATION.name, air_station_id: STATION.id,
    air_aqi_method: 'PM2.5 US AQI (NowCast)', air_aqi_recorded_at: nowCast.recordedAt };
}

let pending;
let lastAttempt = 0;
let cached;
export async function syncOpenAqAir(db, municipalities, key) {
  if (!key) return { error: 'OpenAQ is not configured' };
  if (pending) return pending;
  if (Date.now() - lastAttempt < 10 * 60000) return cached;
  lastAttempt = Date.now();
  pending = (async () => {
    try {
      const municipality = municipalities.find(m => /lapu[\s-]*lapu/i.test(m.municipality_name || m.name || ''));
      if (!municipality) throw new Error('Lapu-Lapu municipality not found');
      const reading = await fetchOpenAqReading(key);
      const id = municipality.municipality_id;
      const { data, error } = await db.from('air_quality').select('id,aqi').eq('municipality_id', id).eq('recorded_at', reading.recorded_at).eq('status', reading.status).limit(1);
      if (error) throw new Error('Cannot check saved OpenAQ reading');
      if (!data?.length) {
        const { error: insertError } = await db.from('air_quality').insert({ municipality_id: id, aqi: reading.aqi,
          pm2_5: reading.pm2_5, pm10: null, so2: null, no2: null, o3: null, co: null,
          status: reading.status, dominant_pollutant: reading.dominant_pollutant, recorded_at: reading.recorded_at });
        if (insertError) throw new Error('Cannot save OpenAQ reading: ' + insertError.message);
      } else if (data[0].aqi !== reading.aqi) {
        // A new hourly aggregate can change NowCast before the latest raw sample changes.
        const { error: updateError } = await db.from('air_quality').update({ aqi: reading.aqi }).eq('id', data[0].id).eq('status', reading.status);
        if (updateError) throw new Error('Cannot refresh saved OpenAQ AQI');
      }
      cached = { municipality_id: id, reading };
    } catch (error) { cached = { error: error.message }; }
    return cached;
  })();
  try { return await pending; } finally { pending = null; }
}
