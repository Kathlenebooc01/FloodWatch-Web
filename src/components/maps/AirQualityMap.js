"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Map, { Source, Layer, NavigationControl } from 'react-map-gl/mapbox';
import { X, Leaf, Microscope, Waves, Wind, Info, Clock, Maximize2, Activity, CloudFog } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/supabase/util/supabase';
import GeneralCard from '../cards/GeneralCard';
import CardHeader from '../cards/CardHeader';
import CardSubHeader from '../cards/CardSubHeader';
import CardBasedText from '../cards/CardBasedText';
import SearchInput from '@/components/forms/SearchInput';
import MapFilterDropdown from './MapFilterDropdown';

// ─── USA AQI Layer Style Definitions for GPU Canvas Rendering ────────────────
const pinCircleLayer = {
  id: 'air-quality-pins',
  type: 'circle',
  paint: {
    'circle-radius': [
      'interpolate',
      ['linear'],
      ['zoom'],
      7, 5,
      10, 8,
      14, 12
    ],
    'circle-color': [
      'match',
      ['get', 'aqiCategory'],
      1, '#22c55e', // Good (0 to 50) - Green
      2, '#eab308', // Moderate (51 to 100) - Yellow
      3, '#f97316', // Unhealthy for sensitive groups (101 to 150) - Orange
      4, '#ef4444', // Unhealthy (151 - 200) - Red
      5, '#9333ea', // Very unhealthy (201-300) - Purple
      6, '#881337', // Hazardous (301-500) - Maroon
      7, '#78350f', // Very Hazardous (501-1000) - Brown
      '#3b82f6'     // No Data / Default - Blue
    ],
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff',
    'circle-opacity': 0.95,
  }
};

const pinLabelLayer = {
  id: 'air-quality-labels',
  type: 'symbol',
  layout: {
    'text-field': ['get', 'municipality_name'],
    'text-size': [
      'interpolate',
      ['linear'],
      ['zoom'],
      8, 10,
      11, 12,
      14, 14
    ],
    'text-offset': [0, 1.2],
    'text-anchor': 'top',
    'text-optional': true,
  },
  paint: {
    'text-color': '#1f2937',
    'text-halo-color': '#ffffff',
    'text-halo-width': 1.5,
  }
};

// ─── USA AQI Standard (EPA / OpenWeather USA Metric) ───────────────────────────
export const USA_AQI_LEGEND = [
  {
    level: 1,
    range: '0 to 50',
    label: 'Good',
    color: '#22c55e',
    colorName: 'Green',
    bg: 'bg-green-50',
    border: 'border-green-200',
    textClass: 'text-green-700',
    minAqi: 0,
    maxAqi: 50,
  },
  {
    level: 2,
    range: '51 to 100',
    label: 'Moderate',
    color: '#eab308',
    colorName: 'Yellow',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    textClass: 'text-yellow-700',
    minAqi: 51,
    maxAqi: 100,
  },
  {
    level: 3,
    range: '101 to 150',
    label: 'Unhealthy for sensitive groups',
    color: '#f97316',
    colorName: 'Orange',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    textClass: 'text-orange-700',
    minAqi: 101,
    maxAqi: 150,
  },
  {
    level: 4,
    range: '151 - 200',
    label: 'Unhealthy',
    color: '#ef4444',
    colorName: 'Red',
    bg: 'bg-red-50',
    border: 'border-red-200',
    textClass: 'text-red-700',
    minAqi: 151,
    maxAqi: 200,
  },
  {
    level: 5,
    range: '201-300',
    label: 'Very unhealthy',
    color: '#9333ea',
    colorName: 'Purple',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    textClass: 'text-purple-700',
    minAqi: 201,
    maxAqi: 300,
  },
  {
    level: 6,
    range: '301-500',
    label: 'Hazardous',
    color: '#881337',
    colorName: 'Maroon',
    bg: 'bg-rose-950/10',
    border: 'border-rose-900/20',
    textClass: 'text-rose-950',
    minAqi: 301,
    maxAqi: 500,
  },
  {
    level: 7,
    range: '501-1000',
    label: 'Very Hazardous',
    color: '#78350f',
    colorName: 'Brown',
    bg: 'bg-amber-950/10',
    border: 'border-amber-900/20',
    textClass: 'text-amber-950',
    minAqi: 501,
    maxAqi: 1000,
  },
];

// Compatibility alias for any existing imports
export const OPENWEATHER_AQI_LEGEND = USA_AQI_LEGEND;

export const getUsaAqiLevel = (aqi, pm2_5, dbStatus) => {
  // 1. Check if dbStatus matches any qualitative label
  if (dbStatus && typeof dbStatus === 'string') {
    const s = dbStatus.trim().toLowerCase();
    if (s.includes('very haz') || s.includes('very_haz')) return 7;
    if (s.includes('haz')) return 6;
    if (s.includes('very unh') || s.includes('very_unh')) return 5;
    if (s.includes('sensitive') || s.includes('sensitive groups')) return 3;
    if (s.includes('unh')) return 4;
    if (s.includes('mod')) return 2;
    if (s.includes('good')) return 1;
  }

  // 2. Check numeric AQI (USA standard 0-1000)
  if (aqi != null && !isNaN(aqi) && aqi !== '') {
    const a = Number(aqi);
    if (a <= 50) return 1;
    if (a <= 100) return 2;
    if (a <= 150) return 3;
    if (a <= 200) return 4;
    if (a <= 300) return 5;
    if (a <= 500) return 6;
    return 7;
  }

  // 3. Fallback to PM2.5 (EPA Breakpoints)
  if (pm2_5 != null && !isNaN(pm2_5) && pm2_5 !== '') {
    const p = Number(pm2_5);
    if (p <= 12.0) return 1;
    if (p <= 35.4) return 2;
    if (p <= 55.4) return 3;
    if (p <= 150.4) return 4;
    if (p <= 250.4) return 5;
    if (p <= 500.4) return 6;
    return 7;
  }

  return 0; // No Data
};

export const getOpenWeatherAqiCategory = (aqi, pm2_5, dbStatus) => {
  return getUsaAqiLevel(aqi, pm2_5, dbStatus);
};

export const getUsaAqiDetails = (aqi, pm2_5, dbStatus) => {
  const level = getUsaAqiLevel(aqi, pm2_5, dbStatus);
  if (level >= 1 && level <= 7) {
    const item = USA_AQI_LEGEND[level - 1];
    return {
      ...item,
      label: dbStatus || item.label,
      level,
    };
  }
  return {
    level: 0,
    range: 'N/A',
    label: dbStatus || 'No Data',
    color: '#3b82f6',
    colorName: 'Blue',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    textClass: 'text-blue-700',
  };
};

export const getOpenWeatherAqiDetails = (aqi, pm2_5, dbStatus) => {
  return getUsaAqiDetails(aqi, pm2_5, dbStatus);
};

// ─── Popup Row helper ────────────────────────────────────────────────────────
const Row = ({ icon, label, value, unit = '' }) => (
  <div className="flex items-center gap-2.5 my-1 py-1 border-b border-gray-100 last:border-0">
    <span className="text-gray-500 shrink-0">{icon}</span>
    <span className="text-gray-500 text-xs font-semibold flex-1 truncate">{label}</span>
    <span className="font-bold text-xs sm:text-sm text-gray-800 shrink-0">
      {value != null && value !== '' ? `${value}${unit}` : '—'}
    </span>
  </div>
);

export default function AirQualityMap({ isFullscreen = false }) {
  const [airData, setAirData] = useState([]);
  const [selectedMuni, setSelectedMuni] = useState(null);
  const [cursor, setCursor] = useState('auto');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  useEffect(() => {
    let isMounted = true;

    // Fetch directly from main tables: municipality_or_city, air_quality, weather_telemetry
    const fetchData = async () => {
      try {
        const [munisRes, airRes, weatherRes] = await Promise.all([
          supabase.from('municipality_or_city').select('*'),
          supabase.from('air_quality').select('*').order('recorded_at', { ascending: false }).order('created_at', { ascending: false }),
          supabase.from('weather_telemetry').select('*').order('fetched_at', { ascending: false })
        ]);

        if (!isMounted) return;

        const munis = munisRes.data || [];
        const airRecords = airRes.data || [];
        const weatherRecords = weatherRes.data || [];

        const mergedData = munis.map((muni) => {
          const id = muni.municipality_id || muni.id;
          const latestAir = airRecords.find((a) => String(a.municipality_id) === String(id)) || {};
          const latestWeather = weatherRecords.find((w) => String(w.municipality_id) === String(id)) || {};

          const latVal = muni.center_latitude ?? muni.latitude;
          const lngVal = muni.center_longitude ?? muni.longitude;

          const lat = parseFloat(latVal);
          const lng = parseFloat(lngVal);

          // Resolve Pollutants from OpenWeather / USA Schema
          const rawPm25 = latestAir.pm2_5 ?? latestAir['pm2.5'] ?? latestAir.pm25 ?? latestAir.pm_2_5 ?? null;
          const rawPm10 = latestAir.pm10 ?? latestAir.pm_10 ?? null;
          const rawAqi = latestAir.aqi != null ? Number(latestAir.aqi) : null;
          const rawSo2 = latestAir.so2 != null ? Number(latestAir.so2) : null;
          const rawNo2 = latestAir.no2 != null ? Number(latestAir.no2) : null;
          const rawO3 = latestAir.o3 != null ? Number(latestAir.o3) : null;
          const rawCo = latestAir.co != null ? Number(latestAir.co) : null;

          const numPm25 = rawPm25 != null && rawPm25 !== '' ? Number(rawPm25) : null;
          const aqiCat = getUsaAqiLevel(rawAqi, numPm25, latestAir.status);

          return {
            ...muni,
            municipality_id: id,
            latitude: !isNaN(lat) && lat !== 0 ? lat : null,
            longitude: !isNaN(lng) && lng !== 0 ? lng : null,
            municipality_name: muni.name || muni.municipality_name || "Unknown Municipality",
            
            // USA Air Quality fields
            aqi: rawAqi,
            aqiCategory: aqiCat,
            pm2_5: numPm25,
            pm10: rawPm10 != null && rawPm10 !== '' ? Number(rawPm10) : null,
            so2: rawSo2,
            no2: rawNo2,
            o3: rawO3,
            co: rawCo,
            dominant_pollutant: latestAir.dominant_pollutant ?? null,
            air_quality_status: latestAir.status ?? null,
            air_recorded_at: latestAir.recorded_at ?? null,

            // Observation feeds fields from weather_telemetry
            temperature: latestWeather.temperature ?? null,
            rainfall_mm: latestWeather.rainfall_mm ?? null,
            rainfall_category: latestWeather.rainfall_category ?? null,
            wind_speed: latestWeather.wind_speed ?? null,
            weather_condition: latestWeather.weather_condition ?? null,
            fetched_at: latestWeather.fetched_at ?? null,
          };
        });

        if (!isMounted) return;

        setAirData(mergedData);

        // Keep selected municipality popup details updated in real-time
        setSelectedMuni((prev) => {
          if (!prev) return null;
          const updated = mergedData.find((m) => String(m.municipality_id) === String(prev.municipality_id));
          return updated || prev;
        });
      } catch (err) {
        console.error("Error fetching AirQualityMap data:", err);
      }
    };

    fetchData();

    // Realtime: Listen to ALL events across telemetry and municipality tables
    const channelId = `realtime-air-quality-map-${Date.now()}`;
    const realtimeChannel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'air_quality' },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'weather_telemetry' },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'municipality_or_city' },
        () => {
          fetchData();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Initial re-sync once websocket confirms connection
          fetchData();
        }
      });

    // 15-second heartbeat auto-sync fallback
    const interval = setInterval(fetchData, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      supabase.removeChannel(realtimeChannel);
    };
  }, []);

  // Filter dataset based on SearchInput and category dropdown
  const filteredAirData = useMemo(() => {
    return airData.filter((item) => {
      const matchSearch = searchQuery.trim() === '' || 
        item.municipality_name.toLowerCase().includes(searchQuery.toLowerCase().trim());

      if (!matchSearch) return false;

      if (filterCategory === 'ALL') return true;
      const cat = getUsaAqiLevel(item.aqi, item.pm2_5, item.air_quality_status);
      return String(cat) === String(filterCategory);
    });
  }, [airData, searchQuery, filterCategory]);

  // Memoized GeoJSON FeatureCollection
  const geojsonData = useMemo(() => {
    const features = filteredAirData
      .filter(
        (m) =>
          m.latitude != null &&
          m.longitude != null &&
          isFinite(m.latitude) &&
          isFinite(m.longitude)
      )
      .map((muni) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [muni.longitude, muni.latitude],
        },
        properties: {
          ...muni,
          aqiCategory: getUsaAqiLevel(muni.aqi, muni.pm2_5, muni.air_quality_status),
        },
      }));

    return {
      type: 'FeatureCollection',
      features,
    };
  }, [filteredAirData]);

  // Handle Map Canvas Click
  const handleMapClick = useCallback((event) => {
    const feature = event.features && event.features[0];
    if (feature) {
      const muniId = feature.properties?.municipality_id;
      const matchedMuni = airData.find(
        (m) => String(m.municipality_id) === String(muniId)
      ) || feature.properties;

      setSelectedMuni(matchedMuni);
    }
  }, [airData]);

  const handleMouseEnter = useCallback(() => setCursor('pointer'), []);
  const handleMouseLeave = useCallback(() => setCursor('auto'), []);

  // USA AQI Dropdown Options
  const aqiFilterOptions = useMemo(() => [
    { value: 'ALL', label: 'All AQI Levels', badge: `${airData.length}`, color: '#3b82f6' },
    { value: '1', label: 'Good (0–50)', badge: 'Green', color: '#22c55e' },
    { value: '2', label: 'Moderate (51–100)', badge: 'Yellow', color: '#eab308' },
    { value: '3', label: 'Unhealthy for sensitive groups (101–150)', badge: 'Orange', color: '#f97316' },
    { value: '4', label: 'Unhealthy (151–200)', badge: 'Red', color: '#ef4444' },
    { value: '5', label: 'Very unhealthy (201–300)', badge: 'Purple', color: '#9333ea' },
    { value: '6', label: 'Hazardous (301–500)', badge: 'Maroon', color: '#881337' },
    { value: '7', label: 'Very Hazardous (501–1000)', badge: 'Brown', color: '#78350f' },
  ], [airData.length]);

  const activeDetails = selectedMuni
    ? getUsaAqiDetails(selectedMuni.aqi, selectedMuni.pm2_5, selectedMuni.air_quality_status)
    : null;

  return (
    <div className={`relative w-full ${isFullscreen ? 'h-screen rounded-none border-0 shadow-none' : 'h-[85vh] xl:h-screen min-h-[600px] rounded-2xl border border-gray-200/80 shadow-sm'} overflow-hidden`}>

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
          options={aqiFilterOptions}
          value={filterCategory}
          onChange={setFilterCategory}
          placeholder="Filter AQI Category"
        />

        {/* Maximize Button to open map-only in a new tab */}
        {!isFullscreen && (
          <button
            type="button"
            onClick={() => window.open('/fullscreen-map?view=air', '_blank')}
            className="flex items-center justify-center bg-white/95 backdrop-blur-md border border-gray-200/90 shadow-md hover:shadow-lg hover:border-gray-300 rounded-xl p-2.5 text-gray-700 hover:text-primary transition-all cursor-pointer select-none"
            title="Open map only in new tab"
            aria-label="Maximize map in new tab"
          >
            <Maximize2 className="size-4" />
          </button>
        )}
      </div>

      {/* ── Mapbox Canvas with WebGL GPU Rendering ── */}
      <Map
        initialViewState={{ latitude: 10.3157, longitude: 123.8854, zoom: 8.5 }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
        style={{ width: '100%', height: '100%' }}
        interactiveLayerIds={['air-quality-pins']}
        onClick={handleMapClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        cursor={cursor}
      >
        <NavigationControl position="top-right" />

        <Source id="air-quality-source" type="geojson" data={geojsonData} cluster={false}>
          <Layer {...pinCircleLayer} />
          <Layer {...pinLabelLayer} />
        </Source>
      </Map>

      {/* ── Floating Legend Card (Bottom-Right: USA AQI Standard) ── */}
      <div className="absolute bottom-4 right-4 z-10 hidden sm:block">
        <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-lg border border-gray-200 max-w-[320px] transition-all">
          <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-gray-100">
            <span className="text-xs font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="size-4 text-primary" /> USA Air Quality Index (AQI)
            </span>
          </div>
          <div className="grid gap-1.5">
            {USA_AQI_LEGEND.map((item) => (
              <div key={item.level} className="flex items-center justify-between text-xs font-semibold py-0.5">
                <div className="flex items-center gap-2 truncate pr-2">
                  <span 
                    className="size-3 rounded-full shrink-0 shadow-xs" 
                    style={{ backgroundColor: item.color }} 
                  />
                  <span className="text-gray-700 truncate font-bold" title={item.label}>
                    {item.label}
                  </span>
                </div>
                <span className="text-gray-500 font-mono text-[11px] shrink-0 font-medium">
                  {item.range}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Floating Detail Panel (Bottom drawer on mobile, left panel on desktop) ── */}
      {selectedMuni && (
        <div
          className="absolute z-40 flex flex-col pointer-events-auto transition-all duration-300 inset-x-3 bottom-3 top-auto max-h-[60vh] sm:inset-x-auto sm:left-4 sm:top-20 sm:bottom-auto sm:w-[320px] sm:max-h-[calc(100vh-100px)] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
        >
          <GeneralCard className="p-0 border-none shadow-none">
            
            {/* Header with Close Button */}
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/50">
              <div>
                <CardHeader className="text-sm font-bold text-gray-900 capitalize">
                  {selectedMuni.municipality_name}
                </CardHeader>
                <CardBasedText className="text-[11px] text-gray-400 font-medium">
                  USA AQI Air Quality Telemetry
                </CardBasedText>
              </div>
              <button
                className="modal-icon-button hover:bg-gray-200"
                onClick={() => setSelectedMuni(null)}
                aria-label="Close"
              >
                <X className="size-4 text-gray-500" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-4 grid gap-4">
              
              {/* Primary USA AQI Alert Card */}
              {activeDetails && (
                <div className={`p-4 rounded-xl border flex items-center justify-between ${activeDetails.bg} border-gray-100`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white shadow-xs">
                      <Leaf className="size-5" style={{ color: activeDetails.color }} />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Health Concern</span>
                      <h4 className="text-sm sm:text-base font-extrabold text-gray-800 leading-tight">
                        {activeDetails.label}
                      </h4>
                      {selectedMuni.dominant_pollutant && (
                        <span className="text-[10px] text-gray-500 font-medium block mt-0.5">
                          Main: <span className="font-bold text-gray-700">{selectedMuni.dominant_pollutant}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black" style={{ color: activeDetails.color }}>
                      {selectedMuni.aqi != null && selectedMuni.aqi !== '' ? selectedMuni.aqi : '—'}
                    </span>
                    <span className="text-[10px] block font-bold text-gray-400">AQI Index</span>
                  </div>
                </div>
              )}

              {/* Pollutant Metrics Breakdown */}
              <div className="grid gap-1">
                <CardSubHeader className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-1">
                  Pollutant Metrics (µg/m³)
                </CardSubHeader>
                <Row icon={<Microscope className="size-4 text-indigo-500" />} label="PM2.5 (Fine particles)" value={selectedMuni.pm2_5} unit=" µg/m³" />
                <Row icon={<Waves className="size-4 text-sky-500" />} label="PM10 (Coarse particles)" value={selectedMuni.pm10} unit=" µg/m³" />
                {selectedMuni.so2 != null && (
                  <Row icon={<CloudFog className="size-4 text-amber-500" />} label="SO₂ (Sulfur Dioxide)" value={selectedMuni.so2} unit=" µg/m³" />
                )}
                {selectedMuni.no2 != null && (
                  <Row icon={<CloudFog className="size-4 text-purple-500" />} label="NO₂ (Nitrogen Dioxide)" value={selectedMuni.no2} unit=" µg/m³" />
                )}
                {selectedMuni.o3 != null && (
                  <Row icon={<Activity className="size-4 text-emerald-500" />} label="O₃ (Ozone)" value={selectedMuni.o3} unit=" µg/m³" />
                )}
                {selectedMuni.co != null && (
                  <Row icon={<CloudFog className="size-4 text-gray-500" />} label="CO (Carbon Monoxide)" value={selectedMuni.co} unit=" µg/m³" />
                )}
                <Row icon={<Wind className="size-4 text-teal-500" />} label="Wind Speed" value={selectedMuni.wind_speed} unit=" m/s" />
              </div>

              {/* Timestamp */}
              <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-400 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5" /> Recorded
                </span>
                <span className="font-semibold text-gray-600">
                  {selectedMuni.air_recorded_at
                    ? new Date(selectedMuni.air_recorded_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                    : selectedMuni.fetched_at
                    ? new Date(selectedMuni.fetched_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                    : "Realtime"}
                </span>
              </div>
            </div>
          </GeneralCard>
        </div>
      )}
    </div>
  );
}

