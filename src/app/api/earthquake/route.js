import { NextResponse } from 'next/server';

// ─── GeoJSON of Cebu Active Fault Lines System (PHIVOLCS / Geological Survey) ───
const CEBU_FAULT_LINES = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'fault-ccfs-main',
      properties: {
        id: 'fault-ccfs-main',
        name: 'Central Cebu Fault System (CCFS)',
        segment: 'Main Trace / Metro Corridor',
        type: 'Active Strike-Slip Fault',
        movement: 'Left-lateral Strike-slip with Normal Component',
        hazard_level: 'High Seismic Hazard',
        slip_rate: '1.0 - 3.0 mm/year',
        length_km: 48.5,
        depth_estimate_km: '10 - 25 km',
        municipalities: 'Balamban, Toledo City, Minglanilla, Talisay City, Cebu City, Liloan, Compostela, Danao City',
        description: 'Primary active tectonic structure traversing central Cebu island through major metropolitan and highland zones.'
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [123.7020, 10.5340],
          [123.7380, 10.4820],
          [123.7740, 10.4350],
          [123.8120, 10.3920],
          [123.8450, 10.3550],
          [123.8780, 10.3200],
          [123.9050, 10.2850],
          [123.9320, 10.2460],
          [123.9680, 10.1980],
          [123.9920, 10.1550]
        ]
      }
    },
    {
      type: 'Feature',
      id: 'fault-uling-toledo',
      properties: {
        id: 'fault-uling-toledo',
        name: 'Uling - Lutopan Fault Segment',
        segment: 'West-Central Cebu Branch',
        type: 'Active Fault Segment',
        movement: 'Oblique-Slip / Normal Faulting',
        hazard_level: 'Moderate - High Seismic Hazard',
        slip_rate: '0.8 - 2.0 mm/year',
        length_km: 32.0,
        depth_estimate_km: '8 - 20 km',
        municipalities: 'Toledo City, Naga City, San Fernando, Pinamungajan',
        description: 'Branch fault system cutting across the central mining and industrial mountain ranges connecting to southern plains.'
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [123.6120, 10.3780],
          [123.6540, 10.3420],
          [123.6980, 10.3010],
          [123.7420, 10.2580],
          [123.7850, 10.2050],
          [123.8240, 10.1520],
          [123.8610, 10.1080]
        ]
      }
    },
    {
      type: 'Feature',
      id: 'fault-north-cebu-bogo',
      properties: {
        id: 'fault-north-cebu-bogo',
        name: 'North Cebu Fault System',
        segment: 'Bogo - San Remigio - Medellin Segment',
        type: 'Active Crustal Fault',
        movement: 'Normal / Extensional Faulting',
        hazard_level: 'Moderate Seismic Hazard',
        slip_rate: '0.5 - 1.5 mm/year',
        length_km: 36.8,
        depth_estimate_km: '5 - 18 km',
        municipalities: 'Tabuelan, San Remigio, Bogo City, Medellin, Daanbantayan',
        description: 'Northern Cebu active fracture corridor running near the Tañon Strait coast northward to the tip of Daanbantayan.'
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [123.8650, 10.8950],
          [123.9020, 10.9580],
          [123.9450, 11.0250],
          [123.9850, 11.0980],
          [124.0150, 11.1720],
          [124.0320, 11.2450]
        ]
      }
    },
    {
      type: 'Feature',
      id: 'fault-south-cebu-argao',
      properties: {
        id: 'fault-south-cebu-argao',
        name: 'South Cebu Coastal Fault',
        segment: 'Sibonga - Argao - Dalaguete - Oslob',
        type: 'Active Fault Segment',
        movement: 'Left-lateral Strike-slip',
        hazard_level: 'Moderate Seismic Hazard',
        slip_rate: '0.5 - 1.2 mm/year',
        length_km: 42.0,
        depth_estimate_km: '10 - 22 km',
        municipalities: 'Sibonga, Argao, Dalaguete, Alcoy, Boljoon, Oslob, Santander',
        description: 'Southeastern coastal trending fault line parallel to the Cebu Strait and Bohol Sea sub-basin.'
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [123.6250, 10.0520],
          [123.5980, 9.9720],
          [123.5650, 9.8950],
          [123.5280, 9.8120],
          [123.4850, 9.7150],
          [123.4480, 9.6120],
          [123.3980, 9.4850]
        ]
      }
    },
    {
      type: 'Feature',
      id: 'fault-southwest-dumanjug',
      properties: {
        id: 'fault-southwest-dumanjug',
        name: 'Southwest Tañon Fault Branch',
        segment: 'Barili - Dumanjug - Moalboal Segment',
        type: 'Active Fault',
        movement: 'Normal / Strike-slip',
        hazard_level: 'Moderate Seismic Hazard',
        slip_rate: '0.6 - 1.4 mm/year',
        length_km: 38.5,
        depth_estimate_km: '7 - 16 km',
        municipalities: 'Aloguinsan, Barili, Dumanjug, Ronda, Alcantara, Moalboal, Badian',
        description: 'Southwestern fault trace running along the Tañon Strait shoreline through agricultural and coastal settlements.'
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [123.5650, 10.2250],
          [123.5380, 10.1520],
          [123.5080, 10.0780],
          [123.4680, 9.9920],
          [123.4250, 9.9120],
          [123.3850, 9.8150]
        ]
      }
    },
    {
      type: 'Feature',
      id: 'fault-camotes-sea',
      properties: {
        id: 'fault-camotes-sea',
        name: 'Camotes Sea Offshore Fault',
        segment: 'Camotes Islands Marine Fault Trace',
        type: 'Active Offshore Fault',
        movement: 'Strike-Slip / Thrust',
        hazard_level: 'High Offshore Seismic & Tsunami Potential',
        slip_rate: '1.2 - 2.8 mm/year',
        length_km: 34.0,
        depth_estimate_km: '12 - 30 km',
        municipalities: 'San Francisco, Poro, Tudela, Pilar (Camotes Islands)',
        description: 'Marine tectonic fault line in the Camotes Sea linking central Cebu with western Leyte tectonic belt.'
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [124.2250, 10.5850],
          [124.2980, 10.6420],
          [124.3720, 10.7050],
          [124.4450, 10.7680],
          [124.5120, 10.8250]
        ]
      }
    },
    {
      type: 'Feature',
      id: 'fault-bantayan-offshore',
      properties: {
        id: 'fault-bantayan-offshore',
        name: 'Bantayan Channel Fault Trace',
        segment: 'Bantayan Island Western Flank',
        type: 'Active Fault Trace',
        movement: 'Normal Fault',
        hazard_level: 'Low - Moderate Seismic Hazard',
        slip_rate: '0.4 - 1.0 mm/year',
        length_km: 26.5,
        depth_estimate_km: '5 - 15 km',
        municipalities: 'Madridejos, Bantayan, Santa Fe',
        description: 'Underwater and shallow active fracture trace situated west of the Bantayan island group in the Visayan Sea.'
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [123.6750, 11.3120],
          [123.7080, 11.2480],
          [123.7420, 11.1820],
          [123.7750, 11.1150]
        ]
      }
    }
  ]
};

export async function GET() {
  try {
    const totalLengthKm = CEBU_FAULT_LINES.features.reduce((sum, f) => sum + (f.properties?.length_km || 0), 0);

    return NextResponse.json({
      success: true,
      fault_lines: CEBU_FAULT_LINES,
      summary: {
        total_fault_segments: CEBU_FAULT_LINES.features.length,
        total_length_km: Number(totalLengthKm.toFixed(1)),
        primary_system: 'Central Cebu Fault System (CCFS)',
        dataSource: 'PHIVOLCS / Geological Survey',
        sector: 'Cebu Province GIS'
      }
    });
  } catch (error) {
    console.error("Cebu Active Fault Lines API Error:", error);
    return NextResponse.json({
      success: false,
      fault_lines: CEBU_FAULT_LINES,
      error: error.message
    }, { status: 500 });
  }
}
