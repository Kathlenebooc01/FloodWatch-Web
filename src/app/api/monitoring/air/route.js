import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { aqiLevel } from '@/lib/monitoring/aqiClassification.mjs';
import { getSelectedAirQuality } from '@/lib/monitoring/latestAirQuality.mjs';

// The air map resolves one stored observation per municipality.
export async function GET() {
  let readings, municipalities, weather;
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const [municipalityResult, weatherResult] = await Promise.all([
      db.from('municipality_or_city').select('municipality_id,name,center_latitude,center_longitude,province_id'),
      db.from('weather_telemetry').select('municipality_id,wind_speed,fetched_at')
        .order('fetched_at', { ascending: false }).limit(200),
    ]);
    if (municipalityResult.error) throw municipalityResult.error;
    municipalities = municipalityResult.data || [];
    weather = weatherResult.data || [];
    readings = await getSelectedAirQuality(db, municipalities);
  } catch (error) {
    console.error('Cannot read air quality observations:', error);
    return NextResponse.json({ error: 'Air quality data is unavailable' }, { status: 503 });
  }
  const byMunicipality = new Map(readings.map((row) => [String(row.municipality_id), row]));
  const weatherByMunicipality = new Map();
  for (const row of weather) {
    const id = String(row.municipality_id);
    if (!weatherByMunicipality.has(id)) weatherByMunicipality.set(id, row);
  }
  const data = municipalities.map((municipality) => {
    const id = String(municipality.municipality_id);
    const reading = byMunicipality.get(id);
    const currentWeather = weatherByMunicipality.get(id);
    const latitude = Number(municipality.center_latitude);
    const longitude = Number(municipality.center_longitude);
    const status = reading?.status ?? null;
    const cleanStatus = typeof status === 'string' ? status.split(' | ')[0].trim() || null : status;
    const numericLevel = aqiLevel(reading?.aqi, null);
    const statusLevel = aqiLevel(null, cleanStatus);
    if (numericLevel && statusLevel && numericLevel !== statusLevel) {
      console.warn('Air quality AQI/status mismatch', {
        municipality_id: item.municipality_id,
        recorded_at: reading.recorded_at,
        aqi: reading.aqi,
        status: cleanStatus,
      });
    }
    const fromOpenAq = typeof status === 'string' && status.includes('OpenAQ:6455462;');
    return {
      municipality_id: municipality.municipality_id,
      municipality_name: municipality.name,
      name: municipality.name,
      province_id: municipality.province_id,
      latitude: Number.isFinite(latitude) && latitude !== 0 ? latitude : null,
      longitude: Number.isFinite(longitude) && longitude !== 0 ? longitude : null,
      wind_speed: currentWeather?.wind_speed ?? null,
      aqi: reading?.aqi ?? null,
      pm2_5: reading?.pm2_5 ?? null,
      pm10: reading?.pm10 ?? null,
      so2: reading?.so2 ?? null,
      no2: reading?.no2 ?? null,
      o3: reading?.o3 ?? null,
      co: reading?.co ?? null,
      dominant_pollutant: reading?.dominant_pollutant ?? null,
      air_recorded_at: reading?.recorded_at ?? null,
      air_data_current: false,
      air_quality_status: cleanStatus,
      ...(fromOpenAq ? {
        air_source: 'OpenAQ / Clarity',
        air_station: 'Lapu-Lapu City',
        air_aqi_method: 'PM2.5 US AQI (NowCast)',
      } : {}),
    };
  });
  return NextResponse.json({ success: true, source: 'selected-batch', count: data.length, data },
    { headers: { 'Cache-Control': 'no-store' } });
}
