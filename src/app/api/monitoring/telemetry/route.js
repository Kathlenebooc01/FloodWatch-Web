import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.NEXT_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Server-side in-memory cache for blazing-fast (<5ms) responses
let cachedData = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const forceFresh = searchParams.get('fresh') === 'true';

  const now = Date.now();
  if (!forceFresh && cachedData && now - lastFetchTime < CACHE_TTL_MS) {
    return NextResponse.json({
      success: true,
      source: 'cache',
      count: cachedData.length,
      data: cachedData
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
      }
    });
  }

  try {
    const [munisRes, weatherRes, airRes] = await Promise.all([
      supabaseAdmin
        .from('municipality_or_city')
        .select('municipality_id, name, center_latitude, center_longitude, province_id'),
      supabaseAdmin
        .from('weather_telemetry')
        .select('*')
        .order('fetched_at', { ascending: false })
        .limit(200),
      supabaseAdmin
        .from('air_quality')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(200)
    ]);

    const munis = munisRes.data || [];
    const weather = weatherRes.data || [];
    const air = airRes.data || [];

    const weatherMap = new Map();
    for (const w of weather) {
      if (!weatherMap.has(w.municipality_id)) {
        weatherMap.set(w.municipality_id, w);
      }
    }

    const airMap = new Map();
    for (const a of air) {
      if (!airMap.has(a.municipality_id)) {
        airMap.set(a.municipality_id, a);
      }
    }

    const getRainfallCat = (mm) => {
      if (mm == null || mm <= 0) return 'No Rain';
      if (mm < 2.5) return 'Light Rain';
      if (mm < 7.5) return 'Moderate Rain';
      if (mm < 15.0) return 'Heavy Rain';
      if (mm <= 30.0) return 'Intense Rain';
      return 'Torrential Rain';
    };

    const merged = munis.map((m) => {
      const w = weatherMap.get(m.municipality_id) || {};
      const a = airMap.get(m.municipality_id) || {};

      const lat = parseFloat(m.center_latitude);
      const lng = parseFloat(m.center_longitude);

      const rawPm25 = a.pm2_5 ?? a['pm2.5'] ?? a.pm25 ?? a.pm_2_5 ?? null;
      const rawPm10 = a.pm10 ?? a.pm_10 ?? null;
      const rawAqi = a.aqi != null ? Number(a.aqi) : null;
      const rainMm = w.rainfall_mm != null ? Number(w.rainfall_mm) : 0;

      return {
        municipality_id: m.municipality_id,
        municipality_name: m.name || 'Unknown Municipality',
        name: m.name || 'Unknown Municipality',
        latitude: !isNaN(lat) && lat !== 0 ? lat : null,
        longitude: !isNaN(lng) && lng !== 0 ? lng : null,
        center_latitude: m.center_latitude,
        center_longitude: m.center_longitude,
        province_id: m.province_id,

        // Weather
        temperature: w.temperature ?? null,
        humidity: w.humidity ?? null,
        heat_index: w.heat_index ?? null,
        heat_index_category: w.heat_index_category ?? null,
        rainfall_mm: rainMm,
        rainfall_category: w.rainfall_category || getRainfallCat(rainMm),
        wind_speed: w.wind_speed ?? null,
        weather_condition: w.weather_condition ?? null,
        fetched_at: w.fetched_at ?? null,

        // Air Quality
        aqi: rawAqi,
        pm2_5: rawPm25 != null && rawPm25 !== '' ? Number(rawPm25) : null,
        pm10: rawPm10 != null && rawPm10 !== '' ? Number(rawPm10) : null,
        air_quality_status: a.status ?? null,
        air_recorded_at: a.recorded_at ?? null,
      };
    });

    cachedData = merged;
    lastFetchTime = Date.now();

    return NextResponse.json({
      success: true,
      source: 'live',
      count: merged.length,
      data: merged
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
      }
    });
  } catch (err) {
    console.error('Error in /api/monitoring/telemetry:', err);
    if (cachedData) {
      return NextResponse.json({
        success: true,
        source: 'stale-cache',
        count: cachedData.length,
        data: cachedData
      });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
