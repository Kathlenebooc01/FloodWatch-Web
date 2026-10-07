import { z } from 'zod';

const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
export function chatTopic(prompt) {
  // General safety advice needs no live database lookup.
  if (/\b(safety|tips|precautions|prepare|preparedness|what to do|how to|explain|define)\b/i.test(prompt)
    && !/\b(current|latest|recent|today|now|temperature|rainfall|wind|inventory|stock|requests?|reports?|incidents?)\b/i.test(prompt)) return 'guidance';
  if (/\b(weather|temperature|temperatura|rain(?:fall)?|wind|panahon|ulan|init)\b/i.test(prompt)) return 'weather';
  if (/\b(requests?|allocat\w*|dispatch\w*)\b/i.test(prompt)) return 'requests';
  if (/\b(inventory|stock|supplies|utilities|equipment|boat|vest)\b/i.test(prompt)) return 'inventory';
  if (/\b(incidents?|reports?|floods?|distress)\b/i.test(prompt)) return 'reports';
  return 'guidance';
}
export function chatTopics(prompt) {
  const topics = new Set();
  if (chatTopic(prompt) === 'guidance' && /\b(safety|tips|precautions|prepare|preparedness|what to do|how to|explain|define)\b/i.test(prompt)
    && !/\b(current|latest|recent|today|now|temperature|rainfall|wind|inventory|stock|requests?|reports?|incidents?)\b/i.test(prompt)) return [];
  for (const [topic, pattern] of Object.entries({
    weather: /\b(weather|temperature|temperatura|rain(?:fall)?|wind|panahon|ulan|init)\b/i,
    requests: /\b(requests?)\b/i,
    allocations: /\b(allocat\w*|dispatch\w*)\b/i,
    inventory: /\b(inventory|stock|supplies|equipment|boat|vest)\b/i,
    utilities: /\b(utilities|resources|catalog)\b/i,
    reports: /\b(incidents?|reports?|floods?)\b/i,
    distress: /\b(distress|sos|rescue signals?)\b/i,
    air: /\b(air quality|aqi|pollution|pm2|pm10)\b/i,
    alerts: /\b(alerts?|warnings?)\b/i,
    news: /\b(news|announcements?|board)\b/i,
    schedule: /\b(schedule|events?|calendar)\b/i,
  })) if (pattern.test(prompt)) topics.add(topic);
  if (/\b(all|everything|overview|summary)\b/i.test(prompt) && /\b(floodwatch|dashboard|situation)\b/i.test(prompt))
    ['weather', 'requests', 'allocations', 'inventory', 'utilities', 'reports', 'distress', 'air', 'alerts', 'news', 'schedule'].forEach(topic => topics.add(topic));
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
  return `${qualifier}**${weather.municipality}: ${weather.temperature_c}\u00b0C**${weather.condition ? `, ${weather.condition}` : ''}.${details ? ` ${details}.` : ''}\n\nObserved ${date} (Philippine time). Source: ${weather.source}.`;
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
  const sources = {
    inventory: ['pdrrmo_inventory', '*'],
    requests: ['resource_requests', 'status, request_reason, created_at, municipality_or_city:municipality_id(name), resource_request_items(quantity_requested, utilities:utilities_id(name, type))'],
    reports: ['incident_report', 'hazard_type, description, status, created_at, municipality_or_city:municipality_id(name)'],
  };
  Object.assign(sources, {
    weather: ['weather_telemetry', 'temperature, humidity, rainfall_mm, wind_speed, weather_condition, fetched_at, expires_at, municipality_or_city:municipality_id(name)', 'fetched_at'],
    air: ['air_quality', '*, municipality_or_city:municipality_id(name)', 'recorded_at'],
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
  server.tool('get_floodwatch_chat_context', 'Retrieve only the requested FloodWatch data category, with municipality names and internal IDs removed.',
    { topic: z.enum(['inventory', 'requests', 'reports', 'guidance', 'weather', 'air', 'distress', 'utilities', 'alerts', 'news', 'schedule', 'allocations']).optional(), topics: z.array(z.enum(['inventory', 'requests', 'reports', 'weather', 'air', 'distress', 'utilities', 'alerts', 'news', 'schedule', 'allocations'])).optional() }, ({ topic, topics }) => result(() => getChatContext(db, topics || topic || 'guidance')));
}
