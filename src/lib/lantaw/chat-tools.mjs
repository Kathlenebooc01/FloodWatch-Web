import { z } from 'zod';

const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
export function chatTopic(prompt) {
  // General safety advice needs no live database lookup.
  if (/\b(safety|tips|precautions|prepare|preparedness|what to do|how to|explain|define)\b/i.test(prompt)
    && !/\b(current|latest|recent|today|now|temperature|rainfall|wind|inventory|stock|requests?|reports?|incidents?|air quality|aqi|pollution|pm2|pm10|heat index|hazards?|landslides?|storm surge|earthquakes?)\b/i.test(prompt)) return 'guidance';
  if (/\b(weather|temperature|temperatura|rain(?:fall)?|wind|panahon|ulan|init)\b/i.test(prompt)) return 'weather';
  if (/\b(heat index|heat stress|feels like)\b/i.test(prompt)) return 'heat';
  if (/\b(air quality|aqi|pollution|pm2|pm10)\b/i.test(prompt)) return 'air';
  if (/\b(hazards?|landslides?|storm surge|earthquakes?)\b/i.test(prompt)) return 'hazards';
  if (/\b(requests?|allocat\w*|dispatch\w*)\b/i.test(prompt)) return 'requests';
  if (/\b(inventory|stock|supplies|utilities|equipment|boat|vest)\b/i.test(prompt)) return 'inventory';
  if (/\b(incidents?|reports?|floods?|distress)\b/i.test(prompt)) return 'reports';
  return 'guidance';
}
export function chatTopics(prompt) {
  const topics = new Set();
  if (chatTopic(prompt) === 'guidance' && /\b(safety|tips|precautions|prepare|preparedness|what to do|how to|explain|define)\b/i.test(prompt)
    && !/\b(current|latest|recent|today|now|temperature|rainfall|wind|inventory|stock|requests?|reports?|incidents?|air quality|aqi|pollution|pm2|pm10|heat index|hazards?|landslides?|storm surge|earthquakes?)\b/i.test(prompt)) return [];
  for (const [topic, pattern] of Object.entries({
    weather: /\b(weather|temperature|temperatura|rain(?:fall)?|wind|panahon|ulan|init)\b/i,
    requests: /\b(requests?)\b/i,
    allocations: /\b(allocat\w*|dispatch\w*)\b/i,
    inventory: /\b(inventory|stock|supplies|equipment|boat|vest)\b/i,
    utilities: /\b(utilities|resources|catalog)\b/i,
    reports: /\b(incidents?|reports?|floods?)\b/i,
    distress: /\b(distress|sos|rescue signals?)\b/i,
    air: /\b(air quality|aqi|pollution|pm2|pm10)\b/i,
    heat: /\b(heat index|heat stress|feels like)\b/i,
    hazards: /\b(hazards?|landslides?|storm surge|earthquakes?)\b/i,
    alerts: /\b(alerts?|warnings?)\b/i,
    news: /\b(news|announcements?|board)\b/i,
    schedule: /\b(schedule|events?|calendar)\b/i,
  })) if (pattern.test(prompt)) topics.add(topic);
  if (/\b(all|everything|overview|summary)\b/i.test(prompt) && /\b(floodwatch|dashboard|situation)\b/i.test(prompt))
    ['weather', 'requests', 'allocations', 'inventory', 'utilities', 'reports', 'distress', 'air', 'heat', 'hazards', 'alerts', 'news', 'schedule'].forEach(topic => topics.add(topic));
  return [...topics];
}
export function sanitizeContext(value) {
  if (Array.isArray(value)) return value.map(sanitizeContext);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !/(?:^id$|_id$|_by$|email|phone|mobile_number|location_point|geofence)/i.test(key))
    .map(([key, entry]) => [key, sanitizeContext(entry)]));
  if (typeof value === 'string') return value.replace(/\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b/gi, '[internal reference]');
  return value;
}

export async function getMunicipalityWeather(db, query, { weatherKey, fetchImpl = fetch, now = Date.now() } = {}) {
  if (!db) throw new Error('Weather data is temporarily unavailable. Please try again.');
  const municipalities = await db.from('municipality_or_city').select('municipality_id, name, center_latitude, center_longitude').limit(500);
  if (municipalities.error) throw new Error('Weather data is temporarily unavailable. Please try again.');
  const normalized = normalize(query);
  const matches = (municipalities.data || []).filter(row => {
    const full = normalize(row.name), core = normalize(row.name.replace(/\b(city|municipality|of)\b/gi, ''));
    return normalized.includes(full) || (core.length >= 4 && normalized.includes(core));
  }).sort((a, b) => b.name.length - a.name.length);
  if (!matches.length) return { available: false, needs_location: true, message: 'Which municipality or city would you like the weather for?' };
  const municipality = matches[0];
  const telemetry = await db.from('weather_telemetry')
    .select('temperature, rainfall_mm, wind_speed, weather_condition, fetched_at, expires_at')
    .eq('municipality_id', municipality.municipality_id).order('fetched_at', { ascending: false }).limit(1);
  const row = telemetry.data?.[0];
  const age = now - new Date(row?.fetched_at).getTime();
  const validExpiry = row?.expires_at ? new Date(row.expires_at).getTime() > now : age <= 3600000;
  const numeric = value => value === null || value === undefined || value === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null;
  const temperature = numeric(row?.temperature);
  const reading = { municipality: municipality.name, temperature_c: temperature, rainfall_mm: numeric(row?.rainfall_mm), wind_speed: numeric(row?.wind_speed), condition: row?.weather_condition, observed_at: row?.fetched_at, source: 'FloodWatch weather telemetry' };
  if (!telemetry.error && row && temperature !== null && age >= 0 && validExpiry) {
    return { available: true, freshness: 'current', ...reading };
  }
  if (weatherKey) {
    try {
      const url = new URL('https://api.openweathermap.org/data/2.5/weather');
      const latitude = numeric(municipality.center_latitude), longitude = numeric(municipality.center_longitude);
      const coordinates = latitude !== null && longitude !== null && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 && (latitude !== 0 || longitude !== 0);
      url.search = new URLSearchParams({ ...(coordinates ? { lat: latitude, lon: longitude } : { q: `${municipality.name},PH` }), units: 'metric', appid: weatherKey }).toString();
      const response = await fetchImpl(url, { signal: AbortSignal.timeout(5000), cache: 'no-store' });
      if (response.ok) {
        const weather = await response.json();
        const observed = weather.dt ? weather.dt * 1000 : NaN;
        const providerName = normalize(weather.name).replace(/city$/, '');
        const expectedName = normalize(municipality.name).replace(/city$/, '');
        if (Number.isFinite(weather.main?.temp) && weather.sys?.country === 'PH' && (coordinates
          ? Number.isFinite(weather.coord?.lat) && Number.isFinite(weather.coord?.lon) && Math.hypot(weather.coord.lat - latitude, (weather.coord.lon - longitude) * Math.cos(latitude * Math.PI / 180)) < 0.14
          : providerName === expectedName)
          && observed <= now + 60000 && now - observed <= 3600000) {
          return { available: true, freshness: 'current', municipality: municipality.name, temperature_c: weather.main.temp,
            rainfall_mm: weather.rain?.['1h'] ?? 0, wind_speed: weather.wind?.speed ?? null,
            condition: weather.weather?.[0]?.description || 'Condition unavailable', observed_at: new Date(observed).toISOString(), source: 'OpenWeather' };
        }
      }
    } catch { /* Never substitute stale readings or invented temperatures. */ }
  }
  if (!telemetry.error && temperature !== null && Number.isFinite(age) && age >= 0) return { available: true, freshness: 'stale', ...reading };
  return { available: false, municipality: municipality.name,
    message: `Current weather for ${municipality.name} is unavailable. Please try again shortly.` };
}
export function weatherReply(weather) {
  if (!weather.available) return weather.message;
  const date = new Date(weather.observed_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const details = [weather.rainfall_mm != null ? `Rainfall: ${weather.rainfall_mm} mm` : '', weather.wind_speed != null ? `Wind: ${weather.wind_speed} m/s` : ''].filter(Boolean).join('. ');
  const qualifier = weather.freshness === 'stale' ? 'Live weather is unavailable. Latest stored reading (not current weather): ' : '';
  return `${qualifier}**${weather.municipality}: ${weather.temperature_c}\u00b0C**${weather.condition ? `, ${weather.condition}` : ''}.${details ? ` ${details}.` : ''}\n\nObserved ${date} (Philippine time).`;
}

// Uses the same stored tables and latest-per-municipality selection as Monitoring.
export async function getMonitoringSnapshot(db, query, { now = Date.now(), weatherKey, fetchImpl = fetch } = {}) {
  if (!db) throw new Error('Monitoring data is temporarily unavailable.');
  const locations = await db.from('municipality_or_city').select('municipality_id, name, center_latitude, center_longitude').limit(500);
  if (locations.error) throw new Error('Monitoring locations are temporarily unavailable.');
  const target = normalize(query);
  const location = (locations.data || []).filter(row => {
    const full = normalize(row.name);
    const core = normalize(row.name.replace(/\b(city|municipality|of)\b/gi, ''));
    return target.includes(full) || (core.length >= 4 && target.includes(core));
  }).sort((a, b) => b.name.length - a.name.length)[0];
  if (!location) return { needs_location: true, message: 'Which municipality or city should I check on the Monitoring page?' };
  const [weatherResult, airResult, alertsResult, reportsResult] = await Promise.all([
    db.from('weather_telemetry').select('*').eq('municipality_id', location.municipality_id).order('fetched_at', { ascending: false }).limit(1),
    db.from('air_quality').select('*').eq('municipality_id', location.municipality_id).order('recorded_at', { ascending: false }).limit(1),
    db.from('municipality_alerts').select('*').eq('municipality_id', location.municipality_id).limit(20),
    db.from('incident_report').select('hazard_type, description, status, created_at').eq('municipality_id', location.municipality_id).order('created_at', { ascending: false }).limit(10),
  ]);
  const weather = weatherResult.error ? null : weatherResult.data?.[0];
  const air = airResult.error ? null : airResult.data?.[0];
  const numeric = value => value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
  const freshness = timestamp => {
    const age = now - Date.parse(timestamp);
    return Number.isFinite(age) && age >= 0 && age <= 3600000 ? 'recent' : 'historical';
  };
  let liveAir = null;
  const latitude = numeric(location.center_latitude), longitude = numeric(location.center_longitude);
  if (weatherKey && (!air || freshness(air.recorded_at) === 'historical') && latitude !== null && longitude !== null
    && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 && (latitude !== 0 || longitude !== 0)) {
    try {
      const url = new URL('https://api.openweathermap.org/data/2.5/air_pollution');
      url.search = new URLSearchParams({ lat: String(latitude), lon: String(longitude), appid: weatherKey }).toString();
      const response = await fetchImpl(url, { signal: AbortSignal.timeout(3500), cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        const item = data.list?.[0];
        const observedAt = item?.dt ? new Date(item.dt * 1000).toISOString() : null;
        if (observedAt && freshness(observedAt) === 'recent' && Number.isInteger(item.main?.aqi)
          && item.main.aqi >= 1 && item.main.aqi <= 5) {
          liveAir = { provider_aqi: item.main.aqi, provider_scale: 'OpenWeather 1–5',
            status: ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'][item.main.aqi - 1],
            pm2_5: numeric(item.components?.pm2_5), pm10: numeric(item.components?.pm10),
            observed_at: observedAt, freshness: 'recent', source: 'OpenWeather Air Pollution API' };
        }
      }
    } catch { /* The dated Monitoring reading remains available below. */ }
  }
  const temperature = numeric(weather?.temperature);
  const humidity = numeric(weather?.humidity);
  const storedHeat = numeric(weather?.heat_index);
  let calculatedHeat = null;
  if (storedHeat === null && temperature !== null && humidity !== null) {
    const t = temperature * 9 / 5 + 32;
    let h = 0.5 * (t + 61 + (t - 68) * 1.2 + humidity * 0.094);
    if (h >= 80) h = -42.379 + 2.04901523 * t + 10.14333127 * humidity - 0.22475541 * t * humidity
      - 0.00683783 * t * t - 0.05481717 * humidity * humidity + 0.00122874 * t * t * humidity
      + 0.00085282 * t * humidity * humidity - 0.00000199 * t * t * humidity * humidity;
    calculatedHeat = Number(((h - 32) * 5 / 9).toFixed(1));
  }
  const heatIndex = storedHeat ?? calculatedHeat;
  const heatCategory = weather?.heat_index_category || (heatIndex === null ? null : heatIndex < 27 ? 'Normal' : heatIndex < 33 ? 'Caution' : heatIndex < 42 ? 'Extreme Caution' : heatIndex < 52 ? 'Danger' : 'Extreme Danger');
  return {
    source: 'FloodWatch Monitoring', municipality: location.name,
    weather: weather ? { temperature_c: temperature, humidity_percent: humidity, rainfall_mm: numeric(weather.rainfall_mm),
      wind_speed: numeric(weather.wind_speed), condition: weather.weather_condition, observed_at: weather.fetched_at,
      freshness: freshness(weather.fetched_at) } : { available: false },
    air: liveAir || (air ? { aqi: numeric(air.aqi), pm2_5: numeric(air.pm2_5 ?? air['pm2.5'] ?? air.pm25 ?? air.pm_2_5),
      pm10: numeric(air.pm10 ?? air.pm_10), status: air.status, dominant_pollutant: air.dominant_pollutant,
      observed_at: air.recorded_at, freshness: freshness(air.recorded_at), source: 'FloodWatch Monitoring' } : { available: false }),
    previous_air: liveAir && air ? { aqi: numeric(air.aqi), status: air.status,
      observed_at: air.recorded_at, freshness: freshness(air.recorded_at) } : null,
    heat: weather ? { heat_index_c: heatIndex, category: heatCategory, calculated: storedHeat === null && calculatedHeat !== null,
      observed_at: weather.fetched_at, freshness: freshness(weather.fetched_at) } : { available: false },
    hazards: { source: 'FloodWatch municipality alerts and incident reports', alerts: alertsResult.error ? [] : sanitizeContext(alertsResult.data || []),
      reports: reportsResult.error ? [] : sanitizeContext(reportsResult.data || []),
      available: !alertsResult.error || !reportsResult.error,
      note: 'Hazard map layers and live regional advisories are separate from municipality telemetry.' },
  };
}
export function monitoringReply(snapshot, topic) {
  if (snapshot.needs_location) return snapshot.message;
  const date = value => new Date(value).toLocaleString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const reading = topic === 'air' ? snapshot.air : topic === 'heat' ? snapshot.heat : snapshot.weather;
  const label = topic === 'air' ? 'air quality' : topic === 'heat' ? 'heat index' : 'weather';
  if (!reading?.observed_at) return `${label[0].toUpperCase() + label.slice(1)} data for ${snapshot.municipality} is unavailable in Monitoring.`;
  const values = topic === 'air'
    ? [reading.provider_aqi != null ? `Air quality index ${reading.provider_aqi}/5` : `AQI ${reading.aqi ?? 'unavailable'}`, reading.status, reading.pm2_5 == null ? null : `PM2.5 ${reading.pm2_5} µg/m³`, reading.pm10 == null ? null : `PM10 ${reading.pm10} µg/m³`]
    : topic === 'heat'
      ? [`${reading.heat_index_c ?? 'unavailable'}°C`, reading.category, reading.calculated ? 'calculated from temperature and humidity' : null]
      : [`${reading.temperature_c ?? 'unavailable'}°C`, reading.condition, reading.rainfall_mm == null ? null : `rainfall ${reading.rainfall_mm} mm`];
  const qualifier = reading.freshness === 'historical' ? 'Latest historical' : 'Latest';
  const previous = topic === 'air' && snapshot.previous_air?.aqi != null
    ? ` Previous stored AQI: ${snapshot.previous_air.aqi}${snapshot.previous_air.status ? ` (${snapshot.previous_air.status})` : ''}, observed ${date(snapshot.previous_air.observed_at)} (Philippine time); this is an older reading on a different AQI scale.` : '';
  return `${qualifier} ${label} for ${snapshot.municipality}: ${values.filter(Boolean).join(', ')}. Observed ${date(reading.observed_at)} (Philippine time).${previous}${reading.freshness === 'historical' ? ' No recent reading is available.' : ''}`;
}

export async function getChatContext(db, topic) {
  if (Array.isArray(topic)) {
    const categories = await Promise.all([...new Set(topic)].filter(value => value !== 'guidance').map(async value => {
      try { return { category: value, ...await getChatContext(db, value) }; }
      catch { return { category: value, available: false, message: 'This data source could not be read.' }; }
    }));
    return { categories };
  }
  if (topic === 'guidance') return {};
  if (!db) throw new Error('FloodWatch data is temporarily unavailable. Please try again.');
  if (topic === 'air') {
    const { data, error, count } = await db.from('air_quality').select('*', { count: 'exact' })
      .order('recorded_at', { ascending: false }).limit(100);
    if (error) throw new Error('Air quality data is temporarily unavailable. Please try again.');
    const { data: municipalities, error: municipalityError } = await db.from('municipality_or_city')
      .select('municipality_id, name').limit(500);
    const names = new Map((municipalityError ? [] : municipalities || []).map(row => [row.municipality_id, row.name]));
    return { source: 'air_quality', sample_limit: 100, total_records: count ?? null,
      truncated: count != null ? count > (data || []).length : null,
      records: (data || []).map(row => sanitizeContext({ ...row, municipality: names.get(row.municipality_id) || null })) };
  }
  const sources = {
    inventory: ['pdrrmo_inventory', '*'],
    requests: ['resource_requests', 'status, request_reason, created_at, municipality_or_city:municipality_id(name), resource_request_items(quantity_requested, utilities:utilities_id(name, type))'],
    reports: ['incident_report', 'hazard_type, description, status, created_at, municipality_or_city:municipality_id(name)'],
  };
  Object.assign(sources, {
    weather: ['weather_telemetry', 'temperature, humidity, rainfall_mm, wind_speed, weather_condition, fetched_at, expires_at, municipality_or_city:municipality_id(name)', 'fetched_at'],
    distress: ['distress_signals', '*, municipality_or_city:municipality_id(name)'],
    utilities: ['utilities', '*', null],
    allocations: ['resource_allocations', '*'],
    alerts: ['municipality_alerts', '*, municipality_or_city:municipality_id(name)'],
    news: ['news_board', 'headline, tags, detailed_content, created_at'],
    schedule: ['scheduled_events', '*', null],
  });
  if (topic === 'news') return { categories: await Promise.all(['news_board', 'announcement_board'].map(async table => {
    const { data, error } = await db.from(table).select(table === 'news_board' ? 'headline, tags, detailed_content, created_at' : 'headline, tags, detailed_message, created_at').order('created_at', { ascending: false }).limit(50);
    return { source: table, sample_limit: 50, available: !error, records: sanitizeContext(data || []) };
  })) };
  if (!sources[topic]) throw new Error('Unsupported FloodWatch data category.');
  const [table, columns, order = 'created_at'] = sources[topic];
  let query = db.from(table).select(columns, { count: 'exact' });
  if (order) query = query.order(order, { ascending: false });
  const { data, error, count } = await query.limit(100);
  if (error) throw new Error('FloodWatch data is temporarily unavailable. Please try again.');
  return { source: table, sample_limit: 100, total_records: count ?? null, truncated: count != null ? count > (data || []).length : null, records: sanitizeContext(data || []) };
}

export function registerChatTools(server, { db, weatherKey, fetchImpl, now } = {}) {
  const result = async work => {
    try { return { content: [{ type: 'text', text: JSON.stringify(await work()) }] }; }
    catch (error) { return { isError: true, content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }] }; }
  };
  server.tool('get_municipality_weather', 'Retrieve verified current weather for a municipality by name; never exposes internal IDs.',
    { municipality_name: z.string() }, ({ municipality_name }) => result(() => getMunicipalityWeather(db, municipality_name, { weatherKey, fetchImpl, now })));
  server.tool('get_monitoring_snapshot', 'Get the Monitoring page weather, air quality, heat index and municipality hazard alerts for a named municipality.',
    { municipality_name: z.string() }, ({ municipality_name }) => result(() => getMonitoringSnapshot(db, municipality_name, { now, weatherKey, fetchImpl })));
  server.tool('get_floodwatch_chat_context', 'Retrieve only the requested FloodWatch data category, with municipality names and internal IDs removed.',
    { topic: z.enum(['inventory', 'requests', 'reports', 'guidance', 'weather', 'air', 'distress', 'utilities', 'alerts', 'news', 'schedule', 'allocations']).optional(), topics: z.array(z.enum(['inventory', 'requests', 'reports', 'weather', 'air', 'distress', 'utilities', 'alerts', 'news', 'schedule', 'allocations'])).optional() }, ({ topic, topics }) => result(() => getChatContext(db, topics || topic || 'guidance')));
}
