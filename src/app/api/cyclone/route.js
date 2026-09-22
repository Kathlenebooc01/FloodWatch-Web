import { NextResponse } from 'next/server';

// Strategic meteorological sampling coordinates across the Philippine Area of Responsibility (PAR)
const PAR_MONITORING_POINTS = [
  { id: 'cebu-central', name: 'Cebu & Central Visayas', lat: 10.3157, lng: 123.8854, sector: 'Central Visayas' },
  { id: 'east-ph-sea-1', name: 'Eastern Visayas Pacific Corridor', lat: 10.8000, lng: 127.5000, sector: 'Philippine Sea (East of Cebu)' },
  { id: 'eastern-samar', name: 'Eastern Samar / Guiuan Coast', lat: 11.0333, lng: 125.7500, sector: 'Eastern Gateway (PAR)' },
  { id: 'surigao-offshore', name: 'Surigao & Dinagat Offshore', lat: 9.7833, lng: 126.1500, sector: 'Northeast Mindanao Trench' },
  { id: 'bicol-catanduanes', name: 'Catanduanes & Bicol Basin', lat: 13.7000, lng: 124.3000, sector: 'Bicol Corridor' },
  { id: 'northeast-luzon', name: 'Northeastern Luzon Sea', lat: 18.2000, lng: 123.5000, sector: 'Northern PAR' },
  { id: 'west-palawan-sea', name: 'West Philippine Sea (Mindoro/Palawan)', lat: 11.5000, lng: 119.5000, sector: 'Western PAR' },
];

// Helper: Calculate distance in kilometers between two coordinates (Haversine formula)
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Categorize storm based on PAGASA & WMO Tropical Cyclone Wind Scale
function classifyTropicalSystem(windSpeedKmh, pressureHpa, conditionText = '', cloudPct = 0) {
  const condLower = conditionText.toLowerCase();

  // 1. Explicit condition or text checks
  if (condLower.includes('super typhoon') || windSpeedKmh >= 185) {
    return {
      category: 'STY',
      label: 'Super Typhoon (STY)',
      severity: 'Extreme Threat',
      badgeColor: 'bg-rose-950 text-white border-rose-800',
      markerColor: '#881337',
      alertLevel: 'Red Alert',
      windRange: '≥ 185 km/h'
    };
  }
  if (condLower.includes('typhoon') || windSpeedKmh >= 118 || (pressureHpa && pressureHpa < 970)) {
    return {
      category: 'TY',
      label: 'Typhoon (TY)',
      severity: 'Severe Threat',
      badgeColor: 'bg-red-600 text-white border-red-500',
      markerColor: '#dc2626',
      alertLevel: 'Red Alert',
      windRange: '118 - 184 km/h'
    };
  }
  if (condLower.includes('severe tropical storm') || windSpeedKmh >= 89 || (pressureHpa && pressureHpa < 985)) {
    return {
      category: 'STS',
      label: 'Severe Tropical Storm (STS)',
      severity: 'High Threat',
      badgeColor: 'bg-orange-600 text-white border-orange-500',
      markerColor: '#ea580c',
      alertLevel: 'Orange Alert',
      windRange: '89 - 117 km/h'
    };
  }
  if (condLower.includes('tropical storm') || windSpeedKmh >= 62 || (pressureHpa && pressureHpa < 995)) {
    return {
      category: 'TS',
      label: 'Tropical Storm (TS)',
      severity: 'Moderate to High Threat',
      badgeColor: 'bg-amber-600 text-white border-amber-500',
      markerColor: '#d97706',
      alertLevel: 'Orange Alert',
      windRange: '62 - 88 km/h'
    };
  }
  if (condLower.includes('tropical depression') || windSpeedKmh >= 39 || (pressureHpa && pressureHpa <= 1002 && windSpeedKmh >= 30)) {
    return {
      category: 'TD',
      label: 'Tropical Depression (TD)',
      severity: 'Moderate Threat / Heavy Rains',
      badgeColor: 'bg-yellow-500 text-yellow-950 border-yellow-400',
      markerColor: '#eab308',
      alertLevel: 'Yellow Alert',
      windRange: '39 - 61 km/h'
    };
  }
  // Low Pressure Area: Pressure significantly below normal standard atmosphere (1013.25 hPa) with high cloudiness
  if (pressureHpa && pressureHpa <= 1006 && (cloudPct >= 70 || condLower.includes('rain') || condLower.includes('thunderstorm'))) {
    return {
      category: 'LPA',
      label: 'Low Pressure Area (LPA)',
      severity: 'Developing System / Rains Possible',
      badgeColor: 'bg-cyan-600 text-white border-cyan-500',
      markerColor: '#0891b2',
      alertLevel: 'Advisory',
      windRange: '< 39 km/h'
    };
  }

  return null; // Normal atmospheric conditions
}

export async function GET() {
  const openWeatherKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || process.env.OPENWEATHER_API_KEY;
  const CEBU_LAT = 10.3157;
  const CEBU_LNG = 123.8854;

  const detectedSystems = [];
  const monitoringLogs = [];

  // ── Step 1: Query OpenWeather API across PAR monitoring grid ─────────────────
  if (openWeatherKey) {
    const fetchPromises = PAR_MONITORING_POINTS.map(async (point) => {
      try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${point.lat}&lon=${point.lng}&appid=${openWeatherKey}&units=metric`;
        const res = await fetch(url, { next: { revalidate: 120 } });
        if (!res.ok) return null;

        const data = await res.json();
        const windMs = data.wind?.speed ?? 0;
        const windKmh = Number((windMs * 3.6).toFixed(1));
        const windGustKmh = data.wind?.gust ? Number((data.wind.gust * 3.6).toFixed(1)) : windKmh;
        const pressure = data.main?.pressure ?? 1013;
        const condition = data.weather?.[0]?.main ?? 'Clear';
        const description = data.weather?.[0]?.description ?? '';
        const clouds = data.clouds?.all ?? 0;
        const rainMm = data.rain?.['1h'] ?? 0;

        monitoringLogs.push({
          sector: point.name,
          pressure,
          windKmh,
          condition
        });

        const classification = classifyTropicalSystem(windKmh, pressure, `${condition} ${description}`, clouds);

        if (classification) {
          const distanceKm = calculateDistanceKm(CEBU_LAT, CEBU_LNG, point.lat, point.lng);
          return {
            id: `ow-${point.id}-${Date.now()}`,
            source: 'OpenWeather Meteorological Telemetry',
            name: `${classification.label} (${point.sector})`,
            category: classification.category,
            categoryLabel: classification.label,
            severity: classification.severity,
            alertLevel: classification.alertLevel,
            badgeColor: classification.badgeColor,
            markerColor: classification.markerColor,
            windKmh,
            windGustKmh,
            windRange: classification.windRange,
            pressureHpa: pressure,
            condition: `${condition} (${description})`,
            rainMm,
            cloudPct: clouds,
            lat: point.lat,
            lng: point.lng,
            sector: point.sector,
            distanceFromCebuKm: distanceKm,
            impactDescription: `Active ${classification.label} located approximately ${distanceKm} km from Cebu in the ${point.sector}. Pressure: ${pressure} hPa, Winds: ${windKmh} km/h (Gusts: ${windGustKmh} km/h).`,
            updatedAt: new Date().toISOString()
          };
        }
        return null;
      } catch (err) {
        console.error(`Error querying OpenWeather for ${point.name}:`, err);
        return null;
      }
    });

    const results = await Promise.all(fetchPromises);
    results.forEach((item) => {
      if (item) detectedSystems.push(item);
    });
  }

  // ── Step 2: Query GDACS live tropical cyclone feed ──────────────────────────
  try {
    const gdacsRes = await fetch('https://www.gdacs.org/gdacsapi/api/events/geteventlist/LIST?eventtype=TC', {
      next: { revalidate: 120 }
    });

    if (gdacsRes.ok) {
      const gdacsData = await gdacsRes.json();
      const features = gdacsData?.features || [];

      // Filter active storms inside PAR bounds: Lat 4°N - 26°N, Lng 114°E - 145°E
      features.forEach((ev) => {
        const coords = ev?.geometry?.coordinates;
        if (!coords || coords.length < 2) return;
        const [lng, lat] = coords;
        const isCurrent = ev?.properties?.iscurrent !== 'false' && ev?.properties?.iscurrent !== false;

        if (isCurrent && lat >= 4 && lat <= 26 && lng >= 114 && lng <= 145) {
          const stormName = ev.properties?.name || 'Tropical Cyclone';
          const alertLevel = ev.properties?.alertlevel || 'Orange';
          const distanceKm = calculateDistanceKm(CEBU_LAT, CEBU_LNG, lat, lng);

          // Avoid duplicate entry if OpenWeather already flagged nearby coordinate
          const isDuplicate = detectedSystems.some(s => calculateDistanceKm(s.lat, s.lng, lat, lng) < 150);

          if (!isDuplicate) {
            let cat = 'TS';
            let catLabel = 'Tropical Cyclone (TC)';
            let badge = 'bg-orange-600 text-white border-orange-500';
            let marker = '#ea580c';

            if (alertLevel.toLowerCase().includes('red') || stormName.toLowerCase().includes('typhoon')) {
              cat = 'TY';
              catLabel = 'Typhoon (TY)';
              badge = 'bg-red-600 text-white border-red-500';
              marker = '#dc2626';
            }

            detectedSystems.push({
              id: `gdacs-${ev.properties?.eventid || Math.random()}`,
              source: 'GDACS Global Disaster Feed & PAGASA',
              name: stormName,
              category: cat,
              categoryLabel: catLabel,
              severity: `${alertLevel} Alert Level`,
              alertLevel: `${alertLevel} Alert`,
              badgeColor: badge,
              markerColor: marker,
              windKmh: 85,
              windGustKmh: 110,
              windRange: 'Active Cyclone',
              pressureHpa: 990,
              condition: ev.properties?.description || 'Active Tropical Cyclone Warning',
              rainMm: null,
              cloudPct: 100,
              lat,
              lng,
              sector: 'Philippine Area of Responsibility (PAR)',
              distanceFromCebuKm: distanceKm,
              impactDescription: `Active storm ${stormName} tracked inside PAR, approx. ${distanceKm} km from Cebu sector.`,
              updatedAt: new Date().toISOString()
            });
          }
        }
      });
    }
  } catch (err) {
    console.error('Error querying GDACS Cyclone Feed:', err);
  }

  // Summary generation
  let highestCategory = 'None';
  let parStatus = 'No active LPA, Tropical Depression, or Typhoon detected in PAR.';
  if (detectedSystems.length > 0) {
    const hasSTY = detectedSystems.some(s => s.category === 'STY');
    const hasTY = detectedSystems.some(s => s.category === 'TY');
    const hasSTS = detectedSystems.some(s => s.category === 'STS');
    const hasTS = detectedSystems.some(s => s.category === 'TS');
    const hasTD = detectedSystems.some(s => s.category === 'TD');
    const hasLPA = detectedSystems.some(s => s.category === 'LPA');

    if (hasSTY) highestCategory = 'Super Typhoon (STY)';
    else if (hasTY) highestCategory = 'Typhoon (TY)';
    else if (hasSTS) highestCategory = 'Severe Tropical Storm (STS)';
    else if (hasTS) highestCategory = 'Tropical Storm (TS)';
    else if (hasTD) highestCategory = 'Tropical Depression (TD)';
    else if (hasLPA) highestCategory = 'Low Pressure Area (LPA)';

    parStatus = `${detectedSystems.length} active meteorological weather system(s) currently detected in PAR.`;
  }

  return NextResponse.json({
    success: true,
    active_systems: detectedSystems,
    summary: {
      total_detected: detectedSystems.length,
      highest_category: highestCategory,
      par_status: parStatus,
      monitored_points: PAR_MONITORING_POINTS.length,
      last_checked: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
    }
  });
}
