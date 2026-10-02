import { NextResponse } from 'next/server';
import { logWeatherSuccess, logWeatherError } from '@/lib/logs/apiLogger';

const CEBU_MONITORING_STATIONS = [
  { id: 'metro-cebu', name: 'Metro Cebu Central', lat: 10.3157, lon: 123.8854, sector: 'Central Metropolitan' },
  { id: 'north-cebu', name: 'Bogo City & Northern Corridor', lat: 11.0511, lon: 124.0055, sector: 'Northern Cebu' },
  { id: 'south-cebu', name: 'Argao & Southern Coast', lat: 9.8824, lon: 123.6019, sector: 'Southern Cebu' },
  { id: 'west-cebu', name: 'Toledo City & Tañon Coast', lat: 10.3780, lon: 123.6410, sector: 'Western Cebu' }
];

let cachedTelemetry = null;
let lastTelemetryFetch = 0;
const CACHE_TTL_MS = 60 * 1000;

export async function GET(request) {
  if (cachedTelemetry && Date.now() - lastTelemetryFetch < CACHE_TTL_MS) {
    // Still log the cache-served access so it appears in API history
    const primary = cachedTelemetry?.stations?.[0];
    if (primary) {
      await logWeatherSuccess(
        `[OpenWeather API] Weather data served from cache for ${primary.name} (${primary.temp_c}°C, ${primary.condition}) — initial app load | STATUS:200 | LATENCY:0ms`
      );
    }
    return NextResponse.json(cachedTelemetry);
  }

  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;

  if (!apiKey) {
    await logWeatherError('OpenWeather API key is not configured in environment');
    return NextResponse.json({
      success: false,
      error: 'OpenWeather API key is not configured'
    }, { status: 500 });
  }

  const fetchStartTime = Date.now();

  try {
    const stationPromises = CEBU_MONITORING_STATIONS.map(async (st) => {
      try {
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${st.lat}&lon=${st.lon}&appid=${apiKey}&units=metric`,
          { next: { revalidate: 300 } }
        );
        if (!res.ok) return null;
        const data = await res.json();
        const rain1h = data.rain?.['1h'] || 0;
        const windKmh = Number(((data.wind?.speed || 0) * 3.6).toFixed(1));

        return {
          id: st.id,
          name: st.name,
          sector: st.sector,
          temp_c: Number(data.main?.temp?.toFixed(1) || 28),
          humidity: data.main?.humidity || 75,
          rain_1h_mm: Number(rain1h.toFixed(1)),
          wind_speed_kmh: windKmh,
          wind_deg: data.wind?.deg || 0,
          condition: data.weather?.[0]?.description || 'Partly Cloudy',
          weather_main: data.weather?.[0]?.main || 'Clear',
          pressure_hpa: data.main?.pressure || 1010
        };
      } catch (e) {
        return null;
      }
    });

    const stations = (await Promise.all(stationPromises)).filter(Boolean);

    // Compute aggregate metrics
    const maxRain1h = stations.length > 0 ? Math.max(...stations.map(s => s.rain_1h_mm)) : 0;
    const maxWindKmh = stations.length > 0 ? Math.max(...stations.map(s => s.wind_speed_kmh)) : 0;
    const avgHumidity = stations.length > 0 ? Math.round(stations.reduce((acc, s) => acc + s.humidity, 0) / stations.length) : 75;

    // 1. Live Flood Advisory Calculation (PAGASA Standard)
    let floodAlert = {
      level: 'Normal',
      statusText: 'No Active Flood Threat',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description: 'Precipitation across all monitored Cebu watersheds is within normal non-threatening limits.',
      maxRainRate: `${maxRain1h} mm/h`
    };

    if (maxRain1h >= 30) {
      floodAlert = {
        level: 'Red Warning',
        statusText: 'Torrential Rain / Severe Flood Threat',
        badgeColor: 'bg-red-50 text-red-700 border-red-200',
        description: 'Critical rainfall rate detected. Severe inundation likely along riverbanks and coastal plains.',
        maxRainRate: `${maxRain1h} mm/h`
      };
    } else if (maxRain1h >= 15) {
      floodAlert = {
        level: 'Orange Warning',
        statusText: 'Intense Rain / Flooding Threatening',
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
        description: 'Flooding is threatening in low-lying residential areas and near drainage channels.',
        maxRainRate: `${maxRain1h} mm/h`
      };
    } else if (maxRain1h >= 7.5) {
      floodAlert = {
        level: 'Yellow Advisory',
        statusText: 'Heavy Rain / Flooding Possible',
        badgeColor: 'bg-yellow-50 text-yellow-800 border-yellow-200',
        description: 'Localized flooding is possible in low-lying areas. Monitor municipal stream gauges.',
        maxRainRate: `${maxRain1h} mm/h`
      };
    } else if (maxRain1h > 0) {
      floodAlert = {
        level: 'Monitoring',
        statusText: 'Light - Moderate Rain Observed',
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
        description: `Active showers observed (${maxRain1h} mm/h). Ground runoff within drainage capacity.`,
        maxRainRate: `${maxRain1h} mm/h`
      };
    }

    // 2. Live Landslide Trigger Index
    let landslideAlert = {
      level: 'Low',
      statusText: 'Stable Mountain Slopes',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description: 'Slope moisture index is low. Minimal risk of rain-induced landslides.'
    };

    if (maxRain1h >= 25 || (maxRain1h >= 15 && avgHumidity > 85)) {
      landslideAlert = {
        level: 'High',
        statusText: 'High Landslide Threat / Saturated Slopes',
        badgeColor: 'bg-red-50 text-red-700 border-red-200',
        description: 'High precipitation on steep mountain corridors (Balamban, Transcentral, Naga-Uling). Avoid hazard zones.'
      };
    } else if (maxRain1h >= 10 || avgHumidity > 80) {
      landslideAlert = {
        level: 'Moderate',
        statusText: 'Moderate Soil Saturation',
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
        description: 'Prolonged rainfall may trigger debris flow on critical slopes > 35° gradient.'
      };
    }

    // 3. Live Storm Surge & Coastal Advisory
    let stormSurgeAlert = {
      level: 'SSA 0',
      statusText: 'Normal Sea State / No Active Surge Threat',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      advisoryRange: '< 0.5m Normal Astronomical Tide',
      description: 'Coastal waters along Cebu Strait and Tañon Strait are normal. No active storm surge warning in effect.'
    };

    if (maxWindKmh >= 118) {
      stormSurgeAlert = {
        level: 'SSA 4',
        statusText: 'Catastrophic Coastal Surge Threat',
        badgeColor: 'bg-rose-950 text-rose-200 border-rose-800',
        advisoryRange: '> 3.0 m Catastrophic Surge',
        description: 'Extreme coastal wave setup and storm surge inundation along exposed shores.'
      };
    } else if (maxWindKmh >= 89) {
      stormSurgeAlert = {
        level: 'SSA 3',
        statusText: 'Severe Storm Surge Advisory',
        badgeColor: 'bg-red-50 text-red-700 border-red-200',
        advisoryRange: '2.01m – 3.0m Severe Surge',
        description: 'Evacuate low-lying coastal areas. Severe seawater inundation anticipated.'
      };
    } else if (maxWindKmh >= 62) {
      stormSurgeAlert = {
        level: 'SSA 2',
        statusText: 'Moderate Storm Surge Advisory',
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
        advisoryRange: '1.01m – 2.0m Coastal Surge',
        description: 'Significant coastal threat. Fisherfolk and coastal structures should exercise extreme caution.'
      };
    } else if (maxWindKmh >= 45) {
      stormSurgeAlert = {
        level: 'SSA 1',
        statusText: 'Low Surge Advisory / Gale Watch',
        badgeColor: 'bg-yellow-50 text-yellow-800 border-yellow-200',
        advisoryRange: '0.5m – 1.0m Surge',
        description: 'Minor coastal flooding possible during high tide due to strong onshore winds.'
      };
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      dataSource: 'PAGASA Weather Standards & OpenWeather Real-time Station Telemetry',
      flood_advisory: floodAlert,
      landslide_advisory: landslideAlert,
      storm_surge_advisory: stormSurgeAlert,
      stations: stations
    };

    cachedTelemetry = result;
    lastTelemetryFetch = Date.now();

    if (stations.length > 0) {
      const latency = Date.now() - fetchStartTime;
      const primary = stations[0];
      await logWeatherSuccess(
        `Fetched realtime meteorological telemetry for ${primary.name || 'Metro Cebu'} (${primary.temp_c}°C, ${primary.condition}, rain: ${primary.rain_1h_mm}mm/h) across ${stations.length} stations | STATUS:200 | LATENCY:${latency}ms`
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('Hazard Telemetry API Error:', err);
    await logWeatherError(err.message || 'Error querying OpenWeather stations');
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}
