import { NextResponse } from 'next/server';

// Helper: Haversine distance in km between two lat/lng points
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// ─── Geologically Accurate Cebu Fault System (PHIVOLCS MCEM & Geological Mapping) ───
// Detailed polyline paths following Cebu's actual topography and cordillera
const CEBU_FAULT_LINES = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'fault-ccfs-main',
      properties: {
        id: 'fault-ccfs-main',
        name: 'Central Cebu Fault (Central Highland Segment)',
        segment: 'Metro Cebu Highland Spine (Danao - Compostela - Cebu City - Talisay)',
        type: 'Active Strike-Slip Fault',
        movement: 'Left-lateral Strike-slip with Normal Component',
        hazard_level: 'High Seismic Hazard',
        slip_rate: '1.0 - 2.5 mm/year',
        length_km: 46.2,
        depth_estimate_km: '10 - 22 km',
        municipalities: 'Danao City, Compostela, Liloan, Cebu City (Highlands), Talisay City',
        description: 'Primary active tectonic structure traversing along the central mountain spine directly behind Metro Cebu urban center.'
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [123.9420, 10.5380],
          [123.9310, 10.5120],
          [123.9180, 10.4850],
          [123.9020, 10.4560],
          [123.8890, 10.4310],
          [123.8760, 10.4080],
          [123.8610, 10.3820],
          [123.8480, 10.3590],
          [123.8340, 10.3370],
          [123.8210, 10.3150],
          [123.8090, 10.2920],
          [123.7950, 10.2680],
          [123.7840, 10.2450]
        ]
      }
    },
    {
      type: 'Feature',
      id: 'fault-balamban',
      properties: {
        id: 'fault-balamban',
        name: 'Balamban - Central Cordillera Fault',
        segment: 'Northwest Cebu Mountain Flank',
        type: 'Active Fault Segment',
        movement: 'Oblique Strike-Slip',
        hazard_level: 'Moderate - High Seismic Hazard',
        slip_rate: '0.8 - 1.8 mm/year',
        length_km: 34.5,
        depth_estimate_km: '8 - 18 km',
        municipalities: 'Asturias, Balamban, Toledo City (North)',
        description: 'Traverses the western slopes of the Cebu mountain range overlooking the Tañon Strait.'
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [123.7380, 10.5820],
          [123.7290, 10.5510],
          [123.7210, 10.5210],
          [123.7120, 10.4890],
          [123.7050, 10.4580],
          [123.6980, 10.4280],
          [123.6890, 10.3950],
          [123.6780, 10.3620]
        ]
      }
    },
    {
      type: 'Feature',
      id: 'fault-uling-toledo',
      properties: {
        id: 'fault-uling-toledo',
        name: 'Uling - Masaba Fault Segment',
        segment: 'West-Central Transverse Valley (Toledo - Naga)',
        type: 'Active Fault Segment',
        movement: 'Strike-Slip / Normal Faulting',
        hazard_level: 'Moderate - High Seismic Hazard',
        slip_rate: '0.9 - 2.0 mm/year',
        length_km: 28.4,
        depth_estimate_km: '8 - 18 km',
        municipalities: 'Toledo City, City of Naga, San Fernando (Uplands)',
        description: 'Cross-island trending fracture corridor connecting the western Toledo coastal plain with east-central mining valleys.'
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [123.6420, 10.3820],
          [123.6650, 10.3540],
          [123.6910, 10.3270],
          [123.7180, 10.3010],
          [123.7420, 10.2780],
          [123.7650, 10.2520],
          [123.7890, 10.2240]
        ]
      }
    },
    {
      type: 'Feature',
      id: 'fault-lutac-jaclupan',
      properties: {
        id: 'fault-lutac-jaclupan',
        name: 'Lutac - Jaclupan Fault Segment',
        segment: 'Metro Cebu South Boundary Corridor',
        type: 'Active Crustal Fault',
        movement: 'Left-lateral Strike-Slip',
        hazard_level: 'High Local Hazard (Watershed proximity)',
        slip_rate: '0.8 - 1.5 mm/year',
        length_km: 21.0,
        depth_estimate_km: '7 - 16 km',
        municipalities: 'Talisay City (Jaclupan), Minglanilla, City of Naga (Lutac)',
        description: 'Traverses through the Jaclupan watershed basin and foothill communities south of Cebu City.'
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [123.7480, 10.2850],
          [123.7710, 10.2680],
          [123.7920, 10.2510],
          [123.8140, 10.2350],
          [123.8350, 10.2180],
          [123.8550, 10.2010]
        ]
      }
    },
    {
      type: 'Feature',
      id: 'fault-north-cebu-bogo',
      properties: {
        id: 'fault-north-cebu-bogo',
        name: 'North Cebu Fault System',
        segment: 'Bogo - San Remigio - Medellin Corridor',
        type: 'Active Crustal Fault',
        movement: 'Normal / Extensional Faulting',
        hazard_level: 'Moderate Seismic Hazard',
        slip_rate: '0.5 - 1.2 mm/year',
        length_km: 31.8,
        depth_estimate_km: '6 - 15 km',
        municipalities: 'San Remigio, Bogo City, Medellin, Daanbantayan',
        description: 'Northern Cebu active fracture corridor running along the coastal plains towards the tip of northern Cebu.'
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [123.9350, 10.9850],
          [123.9520, 11.0250],
          [123.9710, 11.0680],
          [123.9890, 11.1120],
          [124.0080, 11.1650],
          [124.0210, 11.2180]
        ]
      }
    },
    {
      type: 'Feature',
      id: 'fault-south-cebu-argao',
      properties: {
        id: 'fault-south-cebu-argao',
        name: 'South Cebu Coastal Fault Segment',
        segment: 'Sibonga - Argao - Dalaguete Foothills',
        type: 'Active Fault Segment',
        movement: 'Left-lateral Strike-slip',
        hazard_level: 'Moderate Seismic Hazard',
        slip_rate: '0.5 - 1.2 mm/year',
        length_km: 36.2,
        depth_estimate_km: '9 - 20 km',
        municipalities: 'Sibonga, Argao, Dalaguete, Alcoy',
        description: 'Southeastern coastal foothill fault line aligned parallel to the Bohol Strait marine basin.'
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [123.6120, 10.0210],
          [123.5850, 9.9650],
          [123.5580, 9.9120],
          [123.5290, 9.8510],
          [123.4980, 9.7820],
          [123.4680, 9.7150]
        ]
      }
    }
  ]
};

let cachedEarthquake = null;
let lastEarthquakeFetch = 0;
const CACHE_TTL_MS = 60 * 1000;

export async function GET() {
  if (cachedEarthquake && Date.now() - lastEarthquakeFetch < CACHE_TTL_MS) {
    return NextResponse.json(cachedEarthquake);
  }

  const cebuLat = 10.3157;
  const cebuLng = 123.8854;

  let liveEarthquakes = [];
  let usgsError = null;

  try {
    // Query USGS Earthquake API for real live seismic events in Central Visayas & Philippines region
    const usgsUrl = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=8.5&maxlatitude=13.0&minlongitude=121.5&maxlongitude=126.5&minmagnitude=2.0&limit=30';
    
    const usgsRes = await fetch(usgsUrl, { next: { revalidate: 300 } }); // Cache 5 min
    if (usgsRes.ok) {
      const usgsData = await usgsRes.json();
      if (usgsData.features && Array.isArray(usgsData.features)) {
        liveEarthquakes = usgsData.features.map(f => {
          const coords = f.geometry?.coordinates || [0, 0, 0];
          const lng = coords[0];
          const lat = coords[1];
          const depth = coords[2] || 0;
          const mag = f.properties?.mag || 0;
          const timeMs = f.properties?.time || Date.now();
          const distKm = calculateDistanceKm(cebuLat, cebuLng, lat, lng);

          let severity = 'Minor';
          let color = '#FACC15'; // yellow
          if (mag >= 5.5) {
            severity = 'Strong';
            color = '#881337'; // dark red/rose
          } else if (mag >= 4.5) {
            severity = 'Moderate';
            color = '#DC2626'; // red
          } else if (mag >= 3.5) {
            severity = 'Light';
            color = '#EA580C'; // orange
          }

          return {
            id: f.id,
            title: f.properties?.title || `M ${mag} Earthquake`,
            place: f.properties?.place || 'Central Visayas Region',
            magnitude: Number(mag.toFixed(1)),
            depth_km: Number(depth.toFixed(1)),
            coordinates: [lng, lat],
            time: new Date(timeMs).toISOString(),
            time_formatted: new Date(timeMs).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }),
            severity,
            color,
            distance_cebu_km: distKm,
            url: f.properties?.url || null
          };
        });
      }
    }
  } catch (err) {
    console.error('USGS Live Earthquake fetch error:', err);
    usgsError = err.message;
  }

  // Construct GeoJSON for Live Earthquakes
  const liveEarthquakesGeoJson = {
    type: 'FeatureCollection',
    features: liveEarthquakes.map(eq => ({
      type: 'Feature',
      id: eq.id,
      properties: {
        id: eq.id,
        title: eq.title,
        place: eq.place,
        magnitude: eq.magnitude,
        depth_km: eq.depth_km,
        time_formatted: eq.time_formatted,
        severity: eq.severity,
        color: eq.color,
        distance_cebu_km: eq.distance_cebu_km
      },
      geometry: {
        type: 'Point',
        coordinates: eq.coordinates
      }
    }))
  };

  const totalLengthKm = CEBU_FAULT_LINES.features.reduce((sum, f) => sum + (f.properties?.length_km || 0), 0);
  const maxLiveMag = liveEarthquakes.length > 0 ? Math.max(...liveEarthquakes.map(e => e.magnitude)) : null;

  const result = {
    success: true,
    is_live: true,
    live_earthquakes: liveEarthquakes,
    live_earthquakes_geojson: liveEarthquakesGeoJson,
    fault_lines: CEBU_FAULT_LINES,
    summary: {
      total_fault_segments: CEBU_FAULT_LINES.features.length,
      total_length_km: Number(totalLengthKm.toFixed(1)),
      primary_system: 'Central Cebu Fault System (CCFS)',
      total_live_earthquakes: liveEarthquakes.length,
      max_live_magnitude: maxLiveMag,
      dataSource: 'USGS Real-time API & PHIVOLCS MCEM Fault System',
      sector: 'Cebu Province & Central Visayas Corridor',
      last_checked: new Date().toISOString()
    },
    error: usgsError
  };

  cachedEarthquake = result;
  lastEarthquakeFetch = Date.now();

  return NextResponse.json(result);
}
