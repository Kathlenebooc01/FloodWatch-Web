"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Map, { Source, Layer, NavigationControl } from 'react-map-gl/mapbox';
import { 
  X, 
  Flame, 
  Thermometer, 
  Droplets,
  Wind,
  Filter,
  Maximize2
} from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/supabase/util/supabase';
import GeneralCard from '../cards/GeneralCard';
import CardHeader from '../cards/CardHeader';
import CardSubHeader from '../cards/CardSubHeader';
import SearchInput from '@/components/forms/SearchInput';
import MapFilterDropdown from './MapFilterDropdown';

// ─── PAGASA Heat Index Categories & Guidelines ──────────────────────────────
export const HEAT_INDEX_LEGEND = [
  {
    level: 1,
    category: 'Normal',
    range: '< 27°C',
    color: '#22c55e',
    bgColor: 'bg-green-50',
    textColor: 'text-green-800',
    borderColor: 'border-green-200',
    badgeColor: 'bg-green-100 text-green-800',
    description: 'Little to no thermal stress. Comfortable conditions.',
  },
  {
    level: 2,
    category: 'Caution',
    range: '27.0°C – 32.9°C',
    color: '#eab308',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-900',
    borderColor: 'border-yellow-200',
    badgeColor: 'bg-yellow-100 text-yellow-900',
    description: 'Fatigue is possible with prolonged exposure and activity.',
  },
  {
    level: 3,
    category: 'Extreme Caution',
    range: '33.0°C – 41.9°C',
    color: '#f97316',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-900',
    borderColor: 'border-orange-200',
    badgeColor: 'bg-orange-100 text-orange-900',
    description: 'Heat cramps and heat exhaustion possible. Continuing activity could lead to heat stroke.',
  },
  {
    level: 4,
    category: 'Danger',
    range: '42.0°C – 51.9°C',
    color: '#ef4444',
    bgColor: 'bg-red-50',
    textColor: 'text-red-900',
    borderColor: 'border-red-200',
    badgeColor: 'bg-red-100 text-red-900',
    description: 'Heat cramps and heat exhaustion likely; heat stroke probable with continued exposure.',
  },
  {
    level: 5,
    category: 'Extreme Danger',
    range: '≥ 52.0°C',
    color: '#881337',
    bgColor: 'bg-rose-950/10',
    textColor: 'text-rose-950',
    borderColor: 'border-rose-900/30',
    badgeColor: 'bg-rose-900 text-white',
    description: 'Heat stroke is imminent. Extreme danger to life and health.',
  },
];

// Official PAGASA Heat Index Category logic
export function getPagasaHeatIndexCategory(hiC) {
  if (hiC == null || isNaN(hiC)) return "No Data";
  if (hiC < 27) return "Normal";
  if (hiC < 33) return "Caution";           // 27.0°C to 32.9°C
  if (hiC < 42) return "Extreme Caution";   // 33.0°C to 41.9°C
  if (hiC < 52) return "Danger";            // 42.0°C to 51.9°C
  return "Extreme Danger";                  // 52.0°C and above
}

export function getHeatIndexLevel(hiC) {
  if (hiC == null || isNaN(hiC)) return 0;
  if (hiC < 27) return 1;
  if (hiC < 33) return 2;
  if (hiC < 42) return 3;
  if (hiC < 52) return 4;
  return 5;
}

export function getHeatIndexDetails(categoryOrValue) {
  if (typeof categoryOrValue === 'number') {
    const level = getHeatIndexLevel(categoryOrValue);
    return HEAT_INDEX_LEGEND[level - 1] || {
      category: 'No Data',
      range: '—',
      color: '#6b7280',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-700',
      borderColor: 'border-gray-200',
      badgeColor: 'bg-gray-100 text-gray-700',
      description: 'Telemetry data not yet recorded.',
    };
  }

  const catLower = (categoryOrValue || '').toLowerCase().trim();
  const match = HEAT_INDEX_LEGEND.find(l => l.category.toLowerCase() === catLower);
  return match || {
    category: categoryOrValue || 'No Data',
    range: '—',
    color: '#6b7280',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200',
    badgeColor: 'bg-gray-100 text-gray-700',
    description: 'Telemetry data not yet recorded.',
  };
}

// Fallback: Calculate Heat Index (°C) from Temperature (°C) and Relative Humidity (%)
function calculateHeatIndex(tempC, humidity) {
  if (tempC == null || isNaN(tempC)) return null;
  if (humidity == null || isNaN(humidity)) return tempC;

  const T = (tempC * 9 / 5) + 32;
  const RH = humidity;

  let HI_F = 0.5 * (T + 61.0 + ((T - 68.0) * 1.2) + (RH * 0.094));

  if (HI_F >= 80) {
    HI_F = -42.379 + 2.04901523 * T + 10.14333127 * RH - 0.22475541 * T * RH
      - 0.00683783 * T * T - 0.05481717 * RH * RH + 0.00122874 * T * T * RH
      + 0.00085282 * T * RH * RH - 0.00000199 * T * T * RH * RH;

    if (RH < 13 && T >= 80 && T <= 112) {
      HI_F -= ((13 - RH) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
    } else if (RH > 85 && T >= 80 && T <= 87) {
      HI_F += ((RH - 85) / 10) * ((87 - T) / 5);
    }
  }

  const HI_C = (HI_F - 32) * 5 / 9;
  return Number(HI_C.toFixed(1));
}

// ─── Mapbox Layer Definitions for GPU Canvas Rendering ──────────────────────
const heatPinCircleLayer = {
  id: 'heat-index-pins',
  type: 'circle',
  paint: {
    'circle-radius': [
      'interpolate',
      ['linear'],
      ['zoom'],
      7, 6,
      10, 9,
      14, 13
    ],
    'circle-color': [
      'match',
      ['get', 'heatIndexLevel'],
      1, '#22c55e', // Normal (Green)
      2, '#eab308', // Caution (Yellow)
      3, '#f97316', // Extreme Caution (Orange)
      4, '#ef4444', // Danger (Red)
      5, '#881337', // Extreme Danger (Maroon)
      '#6b7280'     // No Data (Gray)
    ],
    'circle-stroke-width': 2.5,
    'circle-stroke-color': '#ffffff',
    'circle-opacity': 0.95,
  }
};

const heatPinLabelLayer = {
  id: 'heat-index-labels',
  type: 'symbol',
  layout: {
    'text-field': [
      'concat',
      ['get', 'municipality_name'],
      '\n',
      ['get', 'heatIndexText']
    ],
    'text-size': [
      'interpolate',
      ['linear'],
      ['zoom'],
      8, 10,
      11, 12,
      14, 14
    ],
    'text-offset': [0, 1.3],
    'text-anchor': 'top',
    'text-optional': true,
  },
  paint: {
    'text-color': '#111827',
    'text-halo-color': '#ffffff',
    'text-halo-width': 2,
  }
};

// ─── Modal Row helper ────────────────────────────────────────────────────────
const DetailRow = ({ icon, label, value, unit = '', highlight = false }) => (
  <div className="flex items-center gap-2.5 my-1.5 py-1.5 border-b border-gray-100 last:border-0">
    <span className="text-gray-500">{icon}</span>
    <span className="text-gray-600 text-xs font-semibold flex-1">{label}</span>
    <span className={`font-bold text-sm ${highlight ? 'text-primary' : 'text-gray-800'}`}>
      {value != null && value !== '' ? `${value}${unit}` : '—'}
    </span>
  </div>
);

export default function HeatIndexMap({ isFullscreen = false }) {
  const [heatData, setHeatData] = useState([]);
  const [selectedMuni, setSelectedMuni] = useState(null);
  const [cursor, setCursor] = useState('auto');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLegendOpen, setIsLegendOpen] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchHeatTelemetryData = async () => {
      try {
        const [munisRes, weatherRes] = await Promise.all([
          supabase.from('municipality_or_city').select('*'),
          supabase.from('weather_telemetry').select('*').order('fetched_at', { ascending: false })
        ]);

        if (!isMounted) return;

        const munis = munisRes.data || [];
        const weatherRecords = weatherRes.data || [];

        const merged = munis.map((muni) => {
          const id = muni.municipality_id || muni.id;
          const latestWeather = weatherRecords.find((w) => w.municipality_id === id) || {};

          const latVal = muni.center_latitude ?? muni.latitude;
          const lngVal = muni.center_longitude ?? muni.longitude;

          const lat = parseFloat(latVal);
          const lng = parseFloat(lngVal);

          const temp = latestWeather.temperature != null ? Number(latestWeather.temperature) : null;
          const humidity = latestWeather.humidity != null ? Number(latestWeather.humidity) : null;
          
          // Use stored heat_index or calculate from temperature + humidity
          let heatIdx = latestWeather.heat_index != null ? Number(latestWeather.heat_index) : null;
          if (heatIdx == null && temp != null && humidity != null) {
            heatIdx = calculateHeatIndex(temp, humidity);
          }

          // Use stored category or calculate from heat index
          let heatCategory = latestWeather.heat_index_category;
          if (!heatCategory && heatIdx != null) {
            heatCategory = getPagasaHeatIndexCategory(heatIdx);
          } else if (!heatCategory) {
            heatCategory = "No Data";
          }

          const level = getHeatIndexLevel(heatIdx);

          return {
            ...muni,
            municipality_id: id,
            latitude: !isNaN(lat) && lat !== 0 ? lat : null,
            longitude: !isNaN(lng) && lng !== 0 ? lng : null,
            municipality_name: muni.name || muni.municipality_name || "Unknown Municipality",

            temperature: temp,
            humidity: humidity,
            heat_index: heatIdx,
            heat_index_category: heatCategory,
            heat_index_level: level,
            wind_speed: latestWeather.wind_speed != null ? Number(latestWeather.wind_speed) : null,
            rainfall_mm: latestWeather.rainfall_mm != null ? Number(latestWeather.rainfall_mm) : null,
            rainfall_category: latestWeather.rainfall_category || null,
            weather_condition: latestWeather.weather_condition || "Clear",
            fetched_at: latestWeather.fetched_at || null,
          };
        });

        if (!isMounted) return;

        setHeatData(merged);
        setLastUpdated(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));

        // Update active popup if open
        setSelectedMuni((prev) => {
          if (!prev) return null;
          const updated = merged.find((m) => String(m.municipality_id) === String(prev.municipality_id));
          return updated || prev;
        });
      } catch (err) {
        console.error("Error fetching Heat Index Map data:", err);
      }
    };

    fetchHeatTelemetryData();

    // Real-time Supabase subscription for weather_telemetry changes
    const channelId = `heat-index-realtime-${Date.now()}`;
    const realtimeChannel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'weather_telemetry' },
        () => {
          fetchHeatTelemetryData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'municipality_or_city' },
        () => {
          fetchHeatTelemetryData();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(realtimeChannel);
    };
  }, []);

  // Filtered dataset based on dropdown category & SearchInput query
  const filteredData = useMemo(() => {
    return heatData.filter((item) => {
      const matchSearch = searchQuery.trim() === '' || 
        item.municipality_name.toLowerCase().includes(searchQuery.toLowerCase().trim());

      if (!matchSearch) return false;

      if (filterCategory === 'ALL') return true;
      if (filterCategory === 'DANGER_GROUP') {
        return item.heat_index_level >= 4; // Danger & Extreme Danger
      }
      if (filterCategory === 'EXTREME_CAUTION') {
        return item.heat_index_level === 3;
      }
      if (filterCategory === 'CAUTION') {
        return item.heat_index_level === 2;
      }
      if (filterCategory === 'NORMAL') {
        return item.heat_index_level === 1;
      }
      return true;
    });
  }, [heatData, filterCategory, searchQuery]);

  // GeoJSON FeatureCollection for Mapbox GPU rendering
  const geojson = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: filteredData
        .filter((item) => item.latitude != null && item.longitude != null)
        .map((item) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [item.longitude, item.latitude],
          },
          properties: {
            municipality_id: item.municipality_id,
            municipality_name: item.municipality_name,
            heat_index: item.heat_index,
            heatIndexLevel: item.heat_index_level,
            heatIndexText: item.heat_index != null ? `${item.heat_index}°C` : 'No Data',
            heat_index_category: item.heat_index_category,
            temperature: item.temperature,
            humidity: item.humidity,
          },
        })),
    };
  }, [filteredData]);

  const heatIndexFilterOptions = useMemo(() => [
    { value: 'ALL', label: 'All Categories', badge: `${heatData.length}`, color: '#3b82f6' },
    { value: 'DANGER_GROUP', label: 'Danger & Extreme', badge: '≥ 42°C', color: '#ef4444' },
    { value: 'EXTREME_CAUTION', label: 'Extreme Caution', badge: '33.0–41.9°C', color: '#f97316' },
    { value: 'CAUTION', label: 'Caution', badge: '27.0–32.9°C', color: '#eab308' },
    { value: 'NORMAL', label: 'Normal', badge: '< 27°C', color: '#22c55e' },
  ], [heatData.length]);

  const onMapClick = useCallback((event) => {
    const feature = event.features && event.features[0];
    if (feature) {
      const muniId = feature.properties.municipality_id;
      const muni = heatData.find((m) => String(m.municipality_id) === String(muniId));
      if (muni) setSelectedMuni(muni);
    } else {
      setSelectedMuni(null);
    }
  }, [heatData]);

  const onMouseEnter = useCallback(() => setCursor('pointer'), []);
  const onMouseLeave = useCallback(() => setCursor('auto'), []);

  const selectedDetails = selectedMuni ? getHeatIndexDetails(selectedMuni.heat_index) : null;

  return (
    <div className={`relative w-full ${isFullscreen ? 'h-screen rounded-none border-0 shadow-none' : 'h-screen min-h-[600px] rounded-2xl shadow-sm'} overflow-hidden bg-gray-900`}>
      
      {/* ── Top Bar Overlay: Standalone SearchInput & Custom Dropdown ── */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2.5 pointer-events-auto">
        {/* Standalone SearchInput */}
        <SearchInput
          placeholder="Search LGU name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-48 sm:w-60 bg-white/95 backdrop-blur-md shadow-md border border-gray-200/80 rounded-xl"
        />

        {/* Custom MapFilterDropdown */}
        <MapFilterDropdown
          options={heatIndexFilterOptions}
          value={filterCategory}
          onChange={setFilterCategory}
          placeholder="Filter Category"
        />

        {/* Maximize Button to open map-only in a new tab */}
        {!isFullscreen && (
          <button
            type="button"
            onClick={() => window.open('/fullscreen-map?view=heat-index', '_blank')}
            className="flex items-center justify-center bg-white/95 backdrop-blur-md border border-gray-200/90 shadow-md hover:shadow-lg hover:border-gray-300 rounded-xl p-2.5 text-gray-700 hover:text-primary transition-all cursor-pointer select-none"
            title="Open map only in new tab"
            aria-label="Maximize map in new tab"
          >
            <Maximize2 className="size-4" />
          </button>
        )}
      </div>

      {/* ── Mapbox Map Canvas ── */}
      <Map
        initialViewState={{ latitude: 10.3157, longitude: 123.8854, zoom: 8.8 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/apex-yoshi/cmp0s3wq700bg01sx2y9i69pw"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
        interactiveLayerIds={['heat-index-pins']}
        onClick={onMapClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        cursor={cursor}
      >
        <NavigationControl position="top-right" style={{ marginTop: '70px' }} />

        <Source id="heat-index-source" type="geojson" data={geojson}>
          <Layer {...heatPinCircleLayer} />
          <Layer {...heatPinLabelLayer} />
        </Source>
      </Map>

      {/* ── Floating Left Detail Drawer (When an LGU is clicked) ── */}
      {selectedMuni && selectedDetails && (
        <div
          key={selectedMuni.municipality_id}
          className="absolute z-40 flex flex-col pointer-events-auto transition-all duration-300 inset-x-3 bottom-3 top-auto max-h-[60vh] sm:inset-x-auto sm:left-4 sm:top-20 sm:bottom-4 sm:w-80 sm:max-h-none"
        >
          <style>{`
            @keyframes panelSlideIn {
              from { opacity: 0; transform: translateX(-20px); }
              to   { opacity: 1; transform: translateX(0); }
            }
          `}</style>

          <GeneralCard className="flex flex-col gap-0 p-0 h-full overflow-hidden shadow-2xl border border-gray-200 bg-white/95 backdrop-blur-md">
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/70">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">Heat Index Monitoring</span>
                <CardHeader className="text-gray-900 capitalize text-base font-black leading-tight">
                  {selectedMuni.municipality_name}
                </CardHeader>
              </div>
              <button
                onClick={() => setSelectedMuni(null)}
                className="hover:bg-gray-200 p-1.5 rounded-full transition-colors cursor-pointer text-gray-500"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-4 grid gap-4">
              
              {/* Primary Heat Index Card */}
              <div className={`p-4 rounded-2xl border ${selectedDetails.borderColor} ${selectedDetails.bgColor} grid gap-2`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="size-5" style={{ color: selectedDetails.color }} />
                    <span className="text-xs font-bold text-gray-700">Heat Index</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${selectedDetails.badgeColor}`}>
                    {selectedDetails.category}
                  </span>
                </div>

                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-4xl font-black" style={{ color: selectedDetails.color }}>
                    {selectedMuni.heat_index != null ? selectedMuni.heat_index : '—'}
                  </span>
                  <span className="text-lg font-bold text-gray-600">°C</span>
                </div>

                <p className={`text-xs font-medium ${selectedDetails.textColor} leading-relaxed mt-0.5`}>
                  {selectedDetails.description}
                </p>
              </div>

              {/* Associated Telemetry (Temperature, Humidity, Wind Speed) */}
              <div className="grid gap-2">
                <CardSubHeader className="text-xs font-bold uppercase text-gray-400 tracking-wider">
                  Associated Telemetry
                </CardSubHeader>
                <DetailRow 
                  icon={<Thermometer className="size-4 text-orange-500" />} 
                  label="Temperature" 
                  value={selectedMuni.temperature} 
                  unit=" °C" 
                />
                <DetailRow 
                  icon={<Droplets className="size-4 text-blue-500" />} 
                  label="Humidity" 
                  value={selectedMuni.humidity} 
                  unit=" %" 
                />
                <DetailRow 
                  icon={<Wind className="size-4 text-cyan-500" />} 
                  label="Wind Speed" 
                  value={selectedMuni.wind_speed} 
                  unit=" m/s" 
                />
              </div>

              {/* Timestamp & Sync Status */}
              <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-400 flex justify-between items-center">
                <span>Last Fetched:</span>
                <span className="font-semibold text-gray-600">
                  {selectedMuni.fetched_at ? new Date(selectedMuni.fetched_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Realtime'}
                </span>
              </div>
            </div>
          </GeneralCard>
        </div>
      )}

      {/* ── Bottom-Right Floating PAGASA Legend Card ── */}
      <div className="absolute bottom-4 right-4 z-20 pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-gray-200 w-72 transition-all">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
            <div className="flex items-center gap-1.5 font-extrabold text-xs text-gray-800">
              <Flame className="size-4 text-primary" />
              <span>PAGASA Heat Index Scale</span>
            </div>
            <button
              onClick={() => setIsLegendOpen(!isLegendOpen)}
              className="text-[11px] text-primary font-bold hover:underline cursor-pointer"
            >
              {isLegendOpen ? "Hide" : "Show"}
            </button>
          </div>

          {isLegendOpen && (
            <div className="space-y-1.5">
              {HEAT_INDEX_LEGEND.map((item) => (
                <div key={item.level} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-3 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-semibold text-gray-700">{item.category}</span>
                  </div>
                  <span className="font-bold text-gray-500 font-mono text-[11px]">{item.range}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-100 flex justify-between items-center text-[10px] text-gray-400">
                <span>PAGASA / DOST Guidelines</span>
                {lastUpdated && <span>Sync: {lastUpdated}</span>}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
