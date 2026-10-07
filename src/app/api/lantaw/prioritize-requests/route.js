import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeRole, ROLES, normalizeRequestStatus, ACTIVE_REQUEST_STATUSES, statusVariants, isHighUrgencyRequest } from '@/lib/domain-values.mjs';
import { AnalysisError, generatePrioritization, validatePrioritization } from '@/lib/lantaw/gemini-prioritization.mjs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 150;
const inFlight = new Map();
const REQUEST_LIMIT = 25;
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (url, options = {}) => fetch(url, { ...options,
        signal: AbortSignal.any([options.signal, AbortSignal.timeout(10000)].filter(Boolean)) }) },
    }) : null;

async function fetchCurrentWeather() {
  const stations = [
    { name: 'Metro Cebu Central', lat: 10.3157, lon: 123.8854 },
    { name: 'Northern Cebu Corridor', lat: 11.0511, lon: 124.0055 },
    { name: 'Southern Cebu Coast', lat: 9.8824, lon: 123.6019 },
  ];
  return Promise.all(stations.map(async station => {
    const unavailable = { name: station.name, available: false, rain_1h_mm: null,
      wind_kmh: null, condition: 'Weather unavailable', flood_risk: 'Unknown' };
    if (!process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY) return unavailable;
    try {
      const url = new URL('https://api.openweathermap.org/data/2.5/weather');
      url.search = new URLSearchParams({ lat: station.lat, lon: station.lon,
        appid: process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY, units: 'metric' }).toString();
      const response = await fetch(url, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
      if (!response.ok) return unavailable;
      const data = await response.json();
      if (!Number.isFinite(data.wind?.speed) || !Number.isFinite(data.main?.temp)) return unavailable;
      const rain = data.rain?.['1h'] ?? 0;
      return { name: station.name, available: true, observed_at: data.dt ? new Date(data.dt * 1000).toISOString() : null,
        temp_c: data.main.temp, rain_1h_mm: rain, wind_kmh: Number((data.wind.speed * 3.6).toFixed(1)),
        condition: data.weather?.[0]?.description || 'Unknown',
        flood_risk: rain > 20 ? 'Critical' : rain > 10 ? 'High' : rain > 2 ? 'Moderate' : 'Low' };
    } catch { return unavailable; }
  }));
}

async function analyzeRequests() {
  const { data: rows, error, count } = await supabase.from('resource_requests')
    .select('*, municipality_or_city:municipality_id(name), resource_request_items(*, utilities:utilities_id(name, type))', { count: 'exact' })
    .in('status', statusVariants(ACTIVE_REQUEST_STATUSES))
    .order('created_at', { ascending: false }).order('request_id', { ascending: false }).limit(REQUEST_LIMIT);
  if (error) throw new AnalysisError('Unable to load resource requests. Please try again.', 503);
  const requestsToAnalyze = (rows || []).map(row => ({
    id: row.request_id,
    municipality: row.municipality_or_city?.name || 'Unknown municipality',
    status: normalizeRequestStatus(row.status) || row.status,
    urgency: isHighUrgencyRequest(row) ? 'High' : (row.urgency || row.priority || 'Unspecified'),
    reason: row.request_reason || '',
    created_at: row.created_at,
    items: (row.resource_request_items || []).map(item => ({
      name: item.utilities?.name || 'Unnamed resource', quantity: item.quantity_requested,
      type: item.utilities?.type || 'Unspecified',
    })),
  }));
  if (!requestsToAnalyze.length) return {
    executive_summary: { summary: 'No active resource requests to analyze.', highest_risk_area: '',
      key_weather_factor: '', strategic_recommendations: [] },
    prioritized_queue: [], weather_telemetry: [], total_requests_analyzed: 0,
    total_active_requests: 0, analyzed_at: new Date().toISOString(),
  };
  const weatherData = await fetchCurrentWeather();
  const prompt = `
You are Lantaw AI, the Chief Disaster Risk Reduction and Resource Allocation Intelligence for the FloodWatch Platform.

TASK:
Analyze these active disaster resource requests, correlate them with REAL-TIME WEATHER CONDITIONS and environmental hazard factors, and generate an intelligent prioritization ranking.

WEATHER CONDITIONS & TELEMETRY:
${JSON.stringify(weatherData, null, 2)}

RESOURCE REQUESTS:
${JSON.stringify(requestsToAnalyze, null, 2)}

INSTRUCTIONS & EVALUATION METRICS:
Use only supplied requests and weather. Never invent telemetry, historical measurements, request IDs, municipalities or supplies. Weather entries marked unavailable are unknown; do not claim rainfall or wind readings for them. Include EVERY supplied request exactly once, using its complete id as request_id. Database urgency and status are authoritative; priority_level is your recommendation and does not change those fields.
1. Prioritize requests based on:
   - Weather Severity (rainfall mm/h, wind speed, storm risk in the municipality's sector).
   - Request details and reported hazards. Do not claim historical flood measurements or vulnerability scores that were not supplied.
   - Life-Safety Urgency (Water Search & Rescue / Medical > Power / Relief > General maintenance).
2. Assign each request:
   - "priority_level": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
   - "urgency_score": integer from 1 to 100 (100 = life-threatening immediate hazard).
   - "weather_impact_factor": description of how weather conditions directly worsen the situation in that area.
   - "ai_reasoning": clear, concise justification for this exact ranking.
   - "recommended_action": clear dispatch/allocation directive for Provincial and National Admins.

3. Provide an executive analysis summary with:
   - "summary": 2-3 sentence overview of overall disaster posture.
   - "highest_risk_area": name of the municipality needing immediate attention.
   - "key_weather_factor": key atmospheric driver (e.g., intense rain bands in Northern Cebu).
   - "strategic_recommendations": array of 3 bullet points for disaster managers.

OUTPUT FORMAT:
Return strictly a valid JSON object matching this schema:
{
  "executive_summary": {
    "summary": "string",
    "highest_risk_area": "string",
    "key_weather_factor": "string",
    "strategic_recommendations": ["string", "string", "string"]
  },
  "prioritized_queue": [
    {
      "rank": 1,
      "request_id": "string",
      "municipality": "string",
      "requested_items": "string (e.g. 3x Inflatable Rescue Boat, 50x Life Vests)",
      "priority_level": "CRITICAL | HIGH | MEDIUM | LOW",
      "urgency_score": 95,
      "weather_impact_factor": "string",
      "ai_reasoning": "string",
      "recommended_action": "string"
    }
  ]
}
`;
  const aiAnalysis = validatePrioritization(await generatePrioritization(prompt, {
    apiKey: process.env.GEMINI_LANTAW_AI,
    model: process.env.GEMINI_LANTAW_MODEL || 'gemini-3.1-flash-lite',
    fallbackModel: process.env.GEMINI_LANTAW_FALLBACK_MODEL,
  }), requestsToAnalyze);
  return { ...aiAnalysis, weather_telemetry: weatherData, analyzed_at: new Date().toISOString(),
    total_requests_analyzed: requestsToAnalyze.length, total_active_requests: count ?? requestsToAnalyze.length };
}

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return NextResponse.json({ success: false, error: 'Please sign in to analyze requests.' }, { status: 401 });
    if (!supabase) throw new AnalysisError('Request analysis is not configured. Contact your administrator.', 503);
    const sessionDb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` }, fetch: (url, options = {}) => fetch(url, {
        ...options, signal: AbortSignal.any([options.signal, AbortSignal.timeout(10000)].filter(Boolean)),
      }) },
    });
    const { data: { user }, error } = await sessionDb.auth.getUser(token);
    if (error || !user) return NextResponse.json({ success: false, error: 'Your session expired. Please sign in again.' }, { status: 401 });
    const { data: profile, error: profileError } = await sessionDb.from('profiles').select('role').eq('id', user.id).single();
    if (profileError) throw new AnalysisError('Unable to verify your admin account right now. Please try Analyze again.', 503);
    if (![ROLES.NATIONAL_ADMIN, ROLES.PROVINCIAL_ADMIN].includes(normalizeRole(profile?.role))) {
      return NextResponse.json({ success: false, error: 'An admin account is required to analyze requests.' }, { status: 403 });
    }
    // Concurrent clicks share one analysis; completed results are never auto-reused.
    let analysis = inFlight.get(user.id);
    if (!analysis) {
      analysis = analyzeRequests();
      inFlight.set(user.id, analysis);
    }
    let data;
    try { data = await analysis; }
    finally { if (inFlight.get(user.id) === analysis) inFlight.delete(user.id); }
    return NextResponse.json({ success: true, data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const status = error instanceof AnalysisError ? error.status : 500;
    return NextResponse.json({ success: false, error: error instanceof AnalysisError
      ? error.message : 'Unable to analyze requests. Please try again.' },
      { status, headers: { 'Cache-Control': 'no-store', ...(status === 503 ? { 'Retry-After': '10' } : {}) } });
  }
}
