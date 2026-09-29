"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Map, { Source, Layer, NavigationControl } from 'react-map-gl/mapbox';
import { 
  Waves, 
  Mountain, 
  Compass, 
  Satellite, 
  Building, 
  CloudLightning, 
  Activity, 
  X, 
  ShieldAlert, 
  Maximize2,
  Radio,
  ExternalLink,
  Droplets,
  Wind,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import HazardMapToogleButton from '../monitoring/HazardMapToogleButton';
import HazardVerticalFilter from '../monitoring/HazardVerticalFilter';
import { getCachedMonitoringData, setCachedMonitoringData } from '@/lib/cache/monitoringCache';
import { 
  DEFAULT_MAPBOX_TOKEN, 
  DEFAULT_MAPBOX_STYLE, 
  DEFAULT_FLOOD_TILESET, 
  DEFAULT_LANDSLIDE_TILESET, 
  DEFAULT_STORM_SURGE_TILESET 
} from '@/lib/constants/mapbox';

const SSA_METADATA = {
  1: { range: '0.5m - 1.0m', desc: 'Low Inundation / Minor Coastal Threat', title: 'Advisory 1' },
  2: { range: '1.01m - 2.0m', desc: 'Moderate Inundation / Coastal Threat', title: 'Advisory 2' },
  3: { range: '2.01m - 3.0m', desc: 'Severe Inundation / Evacuate Lowlands', title: 'Advisory 3' },
  4: { range: '> 3.0m', desc: 'Catastrophic Surge / Extreme Coastal Threat', title: 'Advisory 4' },
};

export default function HazardMap({ isFullscreen = false }) {
  const [activeHazard, setActiveHazard] = useState('flood'); // 'flood' | 'landslide' | 'storm-surge' | 'earthquake'
  const [activeSSA, setActiveSSA] = useState(1); // 1 | 2 | 3 | 4
  const [floodFilter, setFloodFilter] = useState('all'); // 'all' | 1 | 2 | 3
  const [landslideFilter, setLandslideFilter] = useState('all'); // 'all' | 1 | 2 | 3
  const [stormSurgeRiskFilter, setStormSurgeRiskFilter] = useState('all'); // 'all' | 1 | 2 | 3
  const [faultFilter, setFaultFilter] = useState('all'); // 'all' | fault id
  const [isSatellite, setIsSatellite] = useState(false);
  const [showLiveEarthquakes, setShowLiveEarthquakes] = useState(true);

  // ── Real-Time Seismic & Earthquake State (USGS + PHIVOLCS) ──
  const [faultLinesData, setFaultLinesData] = useState(() => getCachedMonitoringData('faultLinesData') || { type: 'FeatureCollection', features: [] });
  const [faultSummary, setFaultSummary] = useState(() => getCachedMonitoringData('faultSummary') || null);
  const [liveEarthquakes, setLiveEarthquakes] = useState(() => getCachedMonitoringData('liveEarthquakes') || []);
  const [liveEarthquakesGeoJson, setLiveEarthquakesGeoJson] = useState(() => getCachedMonitoringData('liveEarthquakesGeoJson') || { type: 'FeatureCollection', features: [] });
  const [selectedFault, setSelectedFault] = useState(null);
  const [selectedEarthquake, setSelectedEarthquake] = useState(null);

  // ── Real-Time Weather & Hazard Telemetry (OpenWeather & PAGASA standards) ──
  const [hazardTelemetry, setHazardTelemetry] = useState(() => getCachedMonitoringData('hazardTelemetry') || null);
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const [cursor, setCursor] = useState('auto');
  const [mapError, setMapError] = useState(null);
  const mapRef = useRef(null);

  const defaultMapStyle = process.env.NEXT_PUBLIC_MAPBOX_STYLE || DEFAULT_MAPBOX_STYLE;
  const satelliteMapStyle = "mapbox://styles/mapbox/satellite-streets-v12";
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || DEFAULT_MAPBOX_TOKEN;
  const landslideTileset = process.env.NEXT_PUBLIC_LANDSLIDE_TILESET || DEFAULT_LANDSLIDE_TILESET;
  const floodTileset = process.env.NEXT_PUBLIC_FLOOD_TILESET || DEFAULT_FLOOD_TILESET;

  // Resolve Storm Surge combined tileset URL
  const stormSurgeTileset = (process.env.NEXT_PUBLIC_STORM_SURGE_COMBINE_TILESET_URL || DEFAULT_STORM_SURGE_TILESET)?.startsWith('mapbox://')
    ? (process.env.NEXT_PUBLIC_STORM_SURGE_COMBINE_TILESET_URL || DEFAULT_STORM_SURGE_TILESET)
    : `mapbox://${process.env.NEXT_PUBLIC_STORM_SURGE_COMBINE_TILESET_ID || 'apex-yoshi.cwto3bl6xxlg'}`;

  // Exact vector source layer names from Mapbox Studio
  const [floodSourceLayer, setFloodSourceLayer] = useState("19a4b9f3ff2a64cacb03");
  const [landslideSourceLayer, setLandslideSourceLayer] = useState("6d3862b7307de146083d");
  const [stormSurgeSourceLayer, setStormSurgeSourceLayer] = useState("5b901451d99f7a522854");

  const [viewState, setViewState] = useState({
    latitude: 10.3157,
    longitude: 123.8854,
    zoom: 9.5,
    bearing: 0,
    pitch: 0
  });

  // 1. Fetch Real-time Seismic & Cebu Active Faults from API
  const fetchSeismicData = useCallback(async () => {
    try {
      const res = await fetch(`/api/earthquake`);
      if (res.ok) {
        const json = await res.json();
        if (json.fault_lines) {
          setFaultLinesData(json.fault_lines);
          setCachedMonitoringData('faultLinesData', json.fault_lines);
        }
        if (json.summary) {
          setFaultSummary(json.summary);
          setCachedMonitoringData('faultSummary', json.summary);
        }
        if (json.live_earthquakes) {
          setLiveEarthquakes(json.live_earthquakes);
          setCachedMonitoringData('liveEarthquakes', json.live_earthquakes);
        }
        if (json.live_earthquakes_geojson) {
          setLiveEarthquakesGeoJson(json.live_earthquakes_geojson);
          setCachedMonitoringData('liveEarthquakesGeoJson', json.live_earthquakes_geojson);
        }
      }
    } catch (err) {
      console.error("Error fetching seismic data:", err);
    }
  }, []);

  // 2. Fetch Live Weather Telemetry across Cebu Provincial Stations
  const fetchTelemetry = useCallback(async () => {
    try {
      setTelemetryLoading(true);
      const res = await fetch(`/api/hazard-telemetry`);
      if (res.ok) {
        const json = await res.json();
        setHazardTelemetry(json);
        setCachedMonitoringData('hazardTelemetry', json);
        setLastRefreshed(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
      }
    } catch (err) {
      console.error("Error fetching hazard telemetry:", err);
    } finally {
      setTelemetryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSeismicData();
    fetchTelemetry();

    // Auto-refresh live data every 2 minutes
    const interval = setInterval(() => {
      fetchSeismicData();
      fetchTelemetry();
    }, 120000);

    return () => clearInterval(interval);
  }, [fetchSeismicData, fetchTelemetry]);

  // Dynamically inspect Mapbox vector tileset metadata if available
  const handleSourceData = (e) => {
    if (!e.map) return;
    try {
      if (floodTileset) {
        const fSrc = e.map.getSource('flood-hazard-source');
        if (fSrc && fSrc.vectorLayerIds && fSrc.vectorLayerIds.length > 0) {
          setFloodSourceLayer(fSrc.vectorLayerIds[0]);
        }
      }
      if (landslideTileset) {
        const lSrc = e.map.getSource('landslide-hazard-source');
        if (lSrc && lSrc.vectorLayerIds && lSrc.vectorLayerIds.length > 0) {
          setLandslideSourceLayer(lSrc.vectorLayerIds[0]);
        }
      }
      if (stormSurgeTileset) {
        const sSrc = e.map.getSource('storm-surge-source');
        if (sSrc && sSrc.vectorLayerIds && sSrc.vectorLayerIds.length > 0) {
          setStormSurgeSourceLayer(sSrc.vectorLayerIds[0]);
        }
      }
    } catch (err) {
      console.error("Error inspecting vector source layer:", err);
    }
  };

  // Toggle visibility of any style layers pre-baked into Mapbox Studio style
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap?.();
    if (!map || !map.isStyleLoaded()) return;

    try {
      const layers = map.getStyle()?.layers || [];
      layers.forEach((l) => {
        const idLower = l.id.toLowerCase();
        if (idLower.includes('flood')) {
          map.setLayoutProperty(l.id, 'visibility', activeHazard === 'flood' ? 'visible' : 'none');
        }
        if (idLower.includes('landslide')) {
          map.setLayoutProperty(l.id, 'visibility', activeHazard === 'landslide' ? 'visible' : 'none');
        }
        if (idLower.includes('surge') || idLower.includes('storm')) {
          map.setLayoutProperty(l.id, 'visibility', activeHazard === 'storm-surge' ? 'visible' : 'none');
        }
      });
    } catch (err) {
      // Ignore if layout property doesn't exist
    }
  }, [activeHazard, isSatellite]);

  // Compute Layer Filter Expressions
  const floodFilterExpression = floodFilter === 'all'
    ? ['has', 'Var']
    : ['==', ['to-number', ['coalesce', ['get', 'Var'], ['get', 'HAZ'], ['get', 'Hazard'], 1]], floodFilter];

  const landslideFilterExpression = landslideFilter === 'all'
    ? ['has', 'LH']
    : ['==', ['to-number', ['coalesce', ['get', 'LH'], ['get', 'GRID'], ['get', 'Var'], ['get', 'HAZ'], 1]], landslideFilter];

  const stormSurgeFilterExpression = stormSurgeRiskFilter === 'all'
    ? ['==', ['to-number', ['coalesce', ['get', 'SSA'], 1]], activeSSA]
    : ['all',
        ['==', ['to-number', ['coalesce', ['get', 'SSA'], 1]], activeSSA],
        ['==', ['to-number', ['coalesce', ['get', 'HAZ'], ['get', 'Var'], 1]], stormSurgeRiskFilter]
      ];

  // Filtered Fault Lines based on selection
  const filteredFaultLinesGeoJson = useMemo(() => {
    if (faultFilter === 'all') return faultLinesData;
    return {
      type: 'FeatureCollection',
      features: (faultLinesData.features || []).filter(f => f.id === faultFilter || f.properties?.id === faultFilter)
    };
  }, [faultLinesData, faultFilter]);

  // Handle map click on fault line trace or live earthquake marker
  const handleMapClick = (event) => {
    if (activeHazard !== 'earthquake') return;
    const features = event.features || [];

    // 1. Check if an earthquake circle was clicked
    const eqFeature = features.find(f => f.layer?.id?.includes('earthquake'));
    if (eqFeature) {
      setSelectedEarthquake(eqFeature.properties);
      setSelectedFault(null);
      return;
    }

    // 2. Check if a fault line trace was clicked
    const faultFeature = features.find(f => f.layer?.id?.includes('fault'));
    if (faultFeature) {
      setSelectedFault({
        properties: faultFeature.properties,
        coordinates: [event.lngLat.lng, event.lngLat.lat]
      });
      setSelectedEarthquake(null);
      return;
    }

    // Clicked elsewhere on map: close inspectors
    setSelectedFault(null);
    setSelectedEarthquake(null);
  };

  const interactiveLayerIds = activeHazard === 'earthquake'
    ? ['fault-lines-main', 'earthquake-points-circle', 'earthquake-points-halo']
    : [];

  return (
    <div className={`relative w-full ${isFullscreen ? 'h-screen rounded-none border-0 shadow-none' : 'h-screen min-h-[600px] rounded-2xl border border-gray-200 shadow-sm'} overflow-hidden bg-gray-900 group`}>
      {/* Mapbox Canvas */}
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onSourceData={handleSourceData}
        onClick={handleMapClick}
        interactiveLayerIds={interactiveLayerIds}
        onMouseEnter={() => setCursor('pointer')}
        onMouseLeave={() => setCursor('auto')}
        cursor={cursor}
        scrollZoom={true}
        dragPan={true}
        dragRotate={true}
        doubleClickZoom={true}
        touchZoomRotate={true}
        touchPitch={true}
        cooperativeGestures={false}
        style={{ width: '100%', height: '100%' }}
        mapStyle={isSatellite ? satelliteMapStyle : defaultMapStyle}
        mapboxAccessToken={mapboxToken}
        onError={(e) => {
          console.error("Mapbox map error:", e);
          setMapError(e?.error?.message || "Failed to load Mapbox style or tileset. Check Mapbox access token.");
        }}
      >
        <NavigationControl position="top-right" />

        {/* ── 1. Flood Hazard Vector Source ── */}
        {floodTileset && (
          <Source id="flood-hazard-source" type="vector" url={floodTileset}>
            <Layer
              id="flood-hazard-fill"
              type="fill"
              source="flood-hazard-source"
              source-layer={floodSourceLayer}
              filter={floodFilterExpression}
              layout={{
                visibility: activeHazard === 'flood' ? 'visible' : 'none'
              }}
              paint={{
                'fill-color': [
                  'case',
                  ['boolean', ['feature-state', 'hover'], false],
                  '#1d4ed8',
                  [
                    'match',
                    ['to-number', ['coalesce', ['get', 'Var'], ['get', 'HAZ'], ['get', 'Hazard'], 1]],
                    1, '#93C5FD',
                    2, '#3B82F6',
                    3, '#1D4ED8',
                    '#1D4ED8'
                  ]
                ],
                'fill-opacity': isSatellite ? 0.55 : 0.65
              }}
            />
            <Layer
              id="flood-hazard-line"
              type="line"
              source="flood-hazard-source"
              source-layer={floodSourceLayer}
              filter={floodFilterExpression}
              layout={{
                visibility: activeHazard === 'flood' ? 'visible' : 'none'
              }}
              paint={{
                'line-color': isSatellite ? '#60A5FA' : '#1E40AF',
                'line-width': isSatellite ? 2 : 1.5,
                'line-opacity': 0.9
              }}
            />
          </Source>
        )}

        {/* ── 2. Landslide Hazard Vector Source ── */}
        {landslideTileset && (
          <Source id="landslide-hazard-source" type="vector" url={landslideTileset}>
            <Layer
              id="landslide-hazard-fill"
              type="fill"
              source="landslide-hazard-source"
              source-layer={landslideSourceLayer}
              filter={landslideFilterExpression}
              layout={{
                visibility: activeHazard === 'landslide' ? 'visible' : 'none'
              }}
              paint={{
                'fill-color': [
                  'case',
                  ['boolean', ['feature-state', 'hover'], false],
                  '#991b1b',
                  [
                    'match',
                    ['to-number', ['coalesce', ['get', 'Var'], ['get', 'HAZ'], ['get', 'Hazard'], 1]],
                    1, '#FACC15',
                    2, '#FB923C',
                    3, '#DC2626',
                    '#DC2626'
                  ]
                ],
                'fill-opacity': isSatellite ? 0.55 : 0.65
              }}
            />
            <Layer
              id="landslide-hazard-line"
              type="line"
              source="landslide-hazard-source"
              source-layer={landslideSourceLayer}
              filter={landslideFilterExpression}
              layout={{
                visibility: activeHazard === 'landslide' ? 'visible' : 'none'
              }}
              paint={{
                'line-color': isSatellite ? '#F87171' : '#991B1B',
                'line-width': isSatellite ? 2 : 1.5,
                'line-opacity': 0.9
              }}
            />
          </Source>
        )}

        {/* ── 3. Storm Surge Combined Hazard Vector Source ── */}
        {stormSurgeTileset && (
          <Source id="storm-surge-source" type="vector" url={stormSurgeTileset}>
            <Layer
              id="storm-surge-fill"
              type="fill"
              source="storm-surge-source"
              source-layer={stormSurgeSourceLayer}
              filter={stormSurgeFilterExpression}
              layout={{
                visibility: activeHazard === 'storm-surge' ? 'visible' : 'none'
              }}
              paint={{
                'fill-color': [
                  'case',
                  ['boolean', ['feature-state', 'hover'], false],
                  '#b91c1c',
                  [
                    'match',
                    ['to-number', ['coalesce', ['get', 'HAZ'], ['get', 'Var'], 1]],
                    1, '#FACC15',
                    2, '#FB923C',
                    3, '#DC2626',
                    '#FACC15'
                  ]
                ],
                'fill-opacity': isSatellite ? 0.55 : 0.60
              }}
            />
            <Layer
              id="storm-surge-line"
              type="line"
              source="storm-surge-source"
              source-layer={stormSurgeSourceLayer}
              filter={stormSurgeFilterExpression}
              layout={{
                visibility: activeHazard === 'storm-surge' ? 'visible' : 'none'
              }}
              paint={{
                'line-color': [
                  'match',
                  ['to-number', ['coalesce', ['get', 'HAZ'], ['get', 'Var'], 1]],
                  1, '#CA8A04',
                  2, '#EA580C',
                  3, '#B91C1C',
                  '#CA8A04'
                ],
                'line-width': isSatellite ? 1.5 : 0.8,
                'line-opacity': 0.75
              }}
            />
          </Source>
        )}

        {/* ── 4a. Cebu Active Fault Lines GeoJSON Layers (PHIVOLCS MCEM System) ── */}
        {activeHazard === 'earthquake' && (
          <Source id="cebu-fault-lines-source" type="geojson" data={filteredFaultLinesGeoJson}>
            {/* Outer Glow Line */}
            <Layer
              id="fault-lines-glow"
              type="line"
              paint={{
                'line-color': '#EF4444',
                'line-width': isSatellite ? 6 : 5,
                'line-opacity': 0.45,
                'line-blur': 3
              }}
            />
            {/* Main Crisp Line */}
            <Layer
              id="fault-lines-main"
              type="line"
              paint={{
                'line-color': '#DC2626',
                'line-width': isSatellite ? 3.5 : 3,
                'line-opacity': 0.95
              }}
            />
            {/* Fault Segment Text Labels along the trace */}
            <Layer
              id="fault-lines-labels"
              type="symbol"
              layout={{
                'text-field': ['get', 'name'],
                'text-size': 11,
                'symbol-placement': 'line',
                'text-offset': [0, -1],
                'text-letter-spacing': 0.05
              }}
              paint={{
                'text-color': '#7F1D1D',
                'text-halo-color': '#FFFFFF',
                'text-halo-width': 2
              }}
            />
          </Source>
        )}

        {/* ── 4b. Live Earthquakes Source & Layers (USGS Real-Time Feed) ── */}
        {activeHazard === 'earthquake' && showLiveEarthquakes && (
          <Source id="live-earthquakes-source" type="geojson" data={liveEarthquakesGeoJson}>
            {/* Outer halo / pulsing radius */}
            <Layer
              id="earthquake-points-halo"
              type="circle"
              paint={{
                'circle-radius': [
                  'interpolate', ['linear'], ['to-number', ['coalesce', ['get', 'magnitude'], 2]],
                  2, 12,
                  4, 20,
                  6, 32
                ],
                'circle-color': ['coalesce', ['get', 'color'], '#DC2626'],
                'circle-opacity': 0.25,
                'circle-stroke-width': 1.5,
                'circle-stroke-color': ['coalesce', ['get', 'color'], '#DC2626'],
                'circle-stroke-opacity': 0.6
              }}
            />
            {/* Core solid circle */}
            <Layer
              id="earthquake-points-circle"
              type="circle"
              paint={{
                'circle-radius': [
                  'interpolate', ['linear'], ['to-number', ['coalesce', ['get', 'magnitude'], 2]],
                  2, 6,
                  4, 10,
                  6, 16
                ],
                'circle-color': ['coalesce', ['get', 'color'], '#DC2626'],
                'circle-stroke-width': 2,
                'circle-stroke-color': '#FFFFFF'
              }}
            />
            {/* Magnitude label */}
            <Layer
              id="earthquake-points-label"
              type="symbol"
              layout={{
                'text-field': ['concat', 'M', ['to-string', ['get', 'magnitude']]],
                'text-size': 10,
                'text-offset': [0, 1.2],
                'text-anchor': 'top'
              }}
              paint={{
                'text-color': '#111827',
                'text-halo-color': '#FFFFFF',
                'text-halo-width': 1.5
              }}
            />
          </Source>
        )}
      </Map>

      {/* Floating Header Controls Overlay */}
      <div className="absolute top-4 left-4 z-20 flex flex-col items-start gap-2.5 max-w-[calc(100%-80px)] pointer-events-none">
        {/* Row 1: Main Hazard Selection & Satellite View */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          <HazardMapToogleButton
            activeHazard={activeHazard}
            onHazardChange={(h) => {
              setActiveHazard(h);
              setSelectedFault(null);
              setSelectedEarthquake(null);
            }}
          />

          {/* Satellite Feature Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsSatellite((prev) => !prev)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md backdrop-blur-md cursor-pointer border ${
              isSatellite
                ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/25 ring-2 ring-blue-400/50'
                : 'bg-white/95 text-gray-700 hover:bg-white border-gray-200/80 hover:text-gray-900'
            }`}
            title="Toggle high-resolution satellite imagery to inspect affected structures and residential areas"
          >
            <Satellite className={`size-4 ${isSatellite ? 'text-white animate-pulse' : 'text-primary'}`} />
            <span>{isSatellite ? 'Satellite Mode ON' : 'Satellite View'}</span>
          </button>

          {/* Real-time Refresh Button */}
          <button
            type="button"
            onClick={() => {
              fetchSeismicData();
              fetchTelemetry();
            }}
            disabled={telemetryLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-md border border-gray-200/80 shadow-md hover:shadow-lg rounded-xl text-xs font-bold text-gray-700 hover:text-primary transition-all cursor-pointer"
            title="Refresh Real-Time Live Telemetry & USGS Seismic Feed"
          >
            <RefreshCw className={`size-3.5 ${telemetryLoading ? 'animate-spin text-primary' : 'text-gray-500'}`} />
            <span className="hidden sm:inline">Refresh Live Data</span>
          </button>

          {/* Maximize Button to open map-only in a new tab */}
          {!isFullscreen && (
            <button
              type="button"
              onClick={() => window.open(`/fullscreen-map?view=hazard`, '_blank')}
              className="flex items-center justify-center bg-white/95 backdrop-blur-md border border-gray-200/80 shadow-md hover:shadow-lg hover:border-gray-300 rounded-xl p-2.5 text-gray-700 hover:text-primary transition-all cursor-pointer select-none"
              title="Open map only in new tab"
              aria-label="Maximize map in new tab"
            >
              <Maximize2 className="size-4" />
            </button>
          )}
        </div>

        {/* Row 2: Live Dynamic Hazard Alert Banner */}
        {hazardTelemetry && (
          <div className="pointer-events-auto flex items-center gap-2 bg-white/95 backdrop-blur-xl border border-gray-200/90 shadow-lg px-3.5 py-1.5 rounded-xl text-xs font-semibold animate-in fade-in slide-in-from-top-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>

            {activeHazard === 'flood' && (
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-lg border text-[11px] font-bold ${hazardTelemetry.flood_advisory.badgeColor}`}>
                  {hazardTelemetry.flood_advisory.level}
                </span>
                <span className="text-gray-700 font-medium">
                  {hazardTelemetry.flood_advisory.statusText}
                </span>
                <span className="hidden md:inline font-mono text-[11px] text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                  Rate: {hazardTelemetry.flood_advisory.maxRainRate}
                </span>
              </div>
            )}

            {activeHazard === 'landslide' && (
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-lg border text-[11px] font-bold ${hazardTelemetry.landslide_advisory.badgeColor}`}>
                  {hazardTelemetry.landslide_advisory.level} Trigger Risk
                </span>
                <span className="text-gray-700 font-medium">
                  {hazardTelemetry.landslide_advisory.statusText}
                </span>
              </div>
            )}

            {activeHazard === 'storm-surge' && (
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-lg border text-[11px] font-bold ${hazardTelemetry.storm_surge_advisory.badgeColor}`}>
                  {hazardTelemetry.storm_surge_advisory.level}
                </span>
                <span className="text-gray-700 font-medium">
                  {hazardTelemetry.storm_surge_advisory.statusText}
                </span>
              </div>
            )}

            {activeHazard === 'earthquake' && (
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-lg border bg-rose-50 text-rose-700 border-rose-200 text-[11px] font-bold">
                  USGS Live Feed
                </span>
                <span className="text-gray-700 font-medium">
                  {liveEarthquakes.length} Real-Time Events in Region
                </span>
                {faultSummary?.max_live_magnitude && (
                  <span className="font-mono text-[11px] text-red-700 font-bold bg-red-50 px-1.5 py-0.5 rounded">
                    Max: M{faultSummary.max_live_magnitude}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Mapbox Loading Error / Token Warning Notice */}
        {mapError && (
          <div className="pointer-events-auto flex items-center gap-2 bg-amber-600/95 text-white backdrop-blur-xl border border-amber-500 shadow-xl px-3.5 py-2 rounded-xl text-xs font-semibold animate-in fade-in max-w-lg">
            <AlertCircle className="size-4 shrink-0 text-white" />
            <span className="flex-1">
              Notice: Map issue ({mapError}). If deploying on Vercel, please ensure NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is configured in Vercel Settings.
            </span>
            <button 
              type="button" 
              onClick={() => setMapError(null)}
              className="hover:bg-amber-700 p-1 rounded-md text-white cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {/* Row 3: Vertical Hazard Filter Card */}
        <div className="pointer-events-auto">
          <HazardVerticalFilter
            activeHazard={activeHazard}
            activeSSA={activeSSA}
            onSSAChange={setActiveSSA}
            floodFilter={floodFilter}
            onFloodFilterChange={setFloodFilter}
            landslideFilter={landslideFilter}
            onLandslideFilterChange={setLandslideFilter}
            stormSurgeRiskFilter={stormSurgeRiskFilter}
            onStormSurgeRiskFilterChange={setStormSurgeRiskFilter}
            faultFilter={faultFilter}
            onFaultFilterChange={setFaultFilter}
            showLiveEarthquakes={showLiveEarthquakes}
            onToggleLiveEarthquakes={setShowLiveEarthquakes}
            telemetry={hazardTelemetry}
          />
        </div>
      </div>

      {/* Floating Interactive Inspector when Fault Line is clicked */}
      {selectedFault && activeHazard === 'earthquake' && (
        <div className="absolute top-20 right-4 z-30 max-w-sm w-full bg-white/95 backdrop-blur-xl border border-gray-200/90 rounded-2xl p-4 shadow-2xl animate-in fade-in zoom-in-95">
          <div className="flex items-start justify-between border-b border-gray-100 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-red-600 shrink-0" />
              <div>
                <h4 className="font-extrabold text-sm text-gray-900 leading-tight">
                  {selectedFault.properties.name}
                </h4>
                <span className="text-[11px] text-gray-500 font-medium">
                  PHIVOLCS MCEM Fault System
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedFault(null)}
              className="p-1 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
              aria-label="Close details"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Segment</span>
              <span className="font-bold text-gray-800 text-right max-w-[200px] truncate">{selectedFault.properties.segment}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Fault Type</span>
              <span className="font-bold text-red-700">{selectedFault.properties.type}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Movement</span>
              <span className="font-bold text-gray-800">{selectedFault.properties.movement}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Estimated Length</span>
              <span className="font-bold text-gray-800">{selectedFault.properties.length_km} km</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Slip Rate</span>
              <span className="font-bold text-gray-800">{selectedFault.properties.slip_rate}</span>
            </div>
            <div className="pt-1.5">
              <span className="text-gray-500 font-medium block mb-1">Traversed Zones:</span>
              <p className="text-[11px] text-gray-700 bg-gray-50 p-2 rounded-lg border border-gray-100 font-semibold leading-relaxed">
                {selectedFault.properties.municipalities}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Interactive Inspector when Live Earthquake Marker is clicked */}
      {selectedEarthquake && activeHazard === 'earthquake' && (
        <div className="absolute top-20 right-4 z-30 max-w-sm w-full bg-white/95 backdrop-blur-xl border border-gray-200/90 rounded-2xl p-4 shadow-2xl animate-in fade-in zoom-in-95">
          <div className="flex items-start justify-between border-b border-gray-100 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-50 text-red-600 rounded-xl border border-red-100">
                <Activity className="size-5 shrink-0" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-gray-900 leading-tight">
                    M {selectedEarthquake.magnitude}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    selectedEarthquake.magnitude >= 4.5
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : selectedEarthquake.magnitude >= 3.5
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-yellow-50 text-yellow-800 border-yellow-200'
                  }`}>
                    {selectedEarthquake.severity} Seismic Event
                  </span>
                </div>
                <span className="text-[11px] text-gray-500 font-medium">
                  USGS Real-time Seismic Network
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedEarthquake(null)}
              className="p-1 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
              aria-label="Close earthquake details"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="py-1 border-b border-gray-50">
              <span className="text-gray-500 font-medium block mb-0.5">Epicenter Location</span>
              <p className="font-bold text-gray-800 text-sm leading-tight">{selectedEarthquake.place}</p>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Distance from Cebu City</span>
              <span className="font-bold text-red-600 font-mono">~{selectedEarthquake.distance_cebu_km} km</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Focal Depth</span>
              <span className="font-bold text-gray-800">{selectedEarthquake.depth_km} km</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Recorded Date & Time</span>
              <span className="font-bold text-gray-800">{selectedEarthquake.time_formatted}</span>
            </div>

            {selectedEarthquake.url && (
              <div className="pt-2">
                <a
                  href={selectedEarthquake.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl transition-colors text-xs border border-red-200/60"
                >
                  <span>View Official USGS Technical Event</span>
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Info Legend Card (Bottom-Right) */}
      <div className="absolute bottom-4 right-4 z-20 max-w-xs w-full bg-white/95 backdrop-blur-xl border border-gray-200/80 rounded-2xl p-4 shadow-xl grid gap-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex items-center gap-2">
            {activeHazard === 'flood' ? (
              <Waves className="size-5 text-[#1D4ED8] shrink-0" />
            ) : activeHazard === 'landslide' ? (
              <Mountain className="size-5 text-[#DC2626] shrink-0" />
            ) : activeHazard === 'storm-surge' ? (
              <CloudLightning className="size-5 text-[#EA580C] shrink-0" />
            ) : (
              <Activity className="size-5 text-[#DC2626] shrink-0" />
            )}
            <div>
              <h4 className="font-extrabold text-sm text-gray-800 leading-tight">
                {activeHazard === 'flood'
                  ? 'Flood Hazard Inundation'
                  : activeHazard === 'landslide'
                  ? 'Landslide Slope Gradient'
                  : activeHazard === 'storm-surge'
                  ? 'Storm Surge Inundation'
                  : 'Active Faults & Live Earthquakes'}
              </h4>
              {activeHazard === 'flood' && hazardTelemetry && (
                <span className="text-[11px] text-blue-600 font-semibold block">
                  Live: {hazardTelemetry.flood_advisory.statusText}
                </span>
              )}
              {activeHazard === 'landslide' && hazardTelemetry && (
                <span className="text-[11px] text-red-600 font-semibold block">
                  Live: {hazardTelemetry.landslide_advisory.statusText}
                </span>
              )}
              {activeHazard === 'storm-surge' && (
                <span className="text-[11px] text-amber-600 font-semibold block">
                  {SSA_METADATA[activeSSA].title} ({SSA_METADATA[activeSSA].range})
                </span>
              )}
              {activeHazard === 'earthquake' && (
                <span className="text-[11px] text-rose-600 font-semibold block">
                  {liveEarthquakes.length} Live Events • {faultSummary?.total_fault_segments || 6} Fault Segments
                </span>
              )}
            </div>
          </div>
          <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-bold uppercase shrink-0">
            {activeHazard === 'earthquake' ? 'USGS & PHIVOLCS' : 'GIS + Live'}
          </span>
        </div>

        {/* Susceptibility Legend Bars with Exact VAR Metrics */}
        <div className="grid gap-2 text-xs font-semibold">
          {activeHazard === 'flood' ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-[#1D4ED8]/[0.65] shadow-xs border border-[#1E40AF]" />
                  <span className="text-gray-800 font-bold">&gt; 1.50 m</span>
                </div>
                <span className="text-gray-500 text-[11px] font-medium">VAR 3 (High Inundation)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-[#3B82F6]/[0.65] shadow-xs border border-[#1E40AF]" />
                  <span className="text-gray-800 font-bold">0.50 m - 1.50 m</span>
                </div>
                <span className="text-gray-500 text-[11px] font-medium">VAR 2 (Moderate)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-[#93C5FD]/[0.65] shadow-xs border border-[#1E40AF]" />
                  <span className="text-gray-800 font-bold">0.10 m - 0.50 m</span>
                </div>
                <span className="text-gray-500 text-[11px] font-medium">VAR 1 (Low Inundation)</span>
              </div>
            </>
          ) : activeHazard === 'landslide' ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-[#DC2626]/[0.65] shadow-xs border border-[#991B1B]" />
                  <span className="text-gray-800 font-bold">&gt; 35°</span>
                </div>
                <span className="text-gray-500 text-[11px] font-medium">VAR 3 (Steep Slopes)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-[#FB923C]/[0.65] shadow-xs border border-[#991B1B]" />
                  <span className="text-gray-800 font-bold">18° - 35°</span>
                </div>
                <span className="text-gray-500 text-[11px] font-medium">VAR 2 (Moderate Slopes)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-[#FACC15]/[0.65] shadow-xs border border-[#991B1B]" />
                  <span className="text-gray-800 font-bold">&lt; 18°</span>
                </div>
                <span className="text-gray-500 text-[11px] font-medium">VAR 1 (Gentle Slopes)</span>
              </div>
            </>
          ) : activeHazard === 'storm-surge' ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-[#DC2626]/[0.60] shadow-xs border border-[#B91C1C]" />
                  <span className="text-gray-700">High Surge Inundation</span>
                </div>
                <span className="text-gray-400 text-[11px]">HAZ 3 (High)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-[#FB923C]/[0.60] shadow-xs border border-[#EA580C]" />
                  <span className="text-gray-700">Moderate Inundation</span>
                </div>
                <span className="text-gray-400 text-[11px]">HAZ 2 (Med)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-[#FACC15]/[0.60] shadow-xs border border-[#CA8A04]" />
                  <span className="text-gray-700">Low Inundation</span>
                </div>
                <span className="text-gray-400 text-[11px]">HAZ 1 (Low)</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-1 rounded-full bg-red-600 shadow-xs" />
                  <span className="text-gray-800 font-bold">Active Fault Line</span>
                </div>
                <span className="text-red-700 text-[11px] font-bold">PHIVOLCS MCEM</span>
              </div>
              <div className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-red-500 ring-2 ring-red-200" />
                  <span className="text-gray-800 font-bold">Live Earthquakes</span>
                </div>
                <span className="text-gray-500 text-[11px] font-medium">USGS Real-time</span>
              </div>
              <div className="flex items-center justify-between py-0.5">
                <span className="text-gray-500 font-medium">Central Cebu System</span>
                <span className="text-gray-800 font-bold">{faultSummary?.total_fault_segments || 6} Segments</span>
              </div>
            </>
          )}
        </div>

        {/* Structure Exposure Banner when Satellite Mode is Active */}
        {isSatellite && (
          <div className="p-2.5 bg-blue-50/90 border border-blue-200/80 rounded-xl text-[11px] text-blue-900 flex items-start gap-2 shadow-xs">
            <Building className="size-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Residential Exposure Active:</span> Zoom in to view individual rooftops, houses, and settlements under the colored risk zones.
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-medium">
          <span className="flex items-center gap-1">
            <Compass className="size-3 text-primary" /> Cebu Province GIS
          </span>
          <span className="text-primary font-bold">
            {lastRefreshed ? `Live (${lastRefreshed})` : 'Live Stream Active'}
          </span>
        </div>
      </div>
    </div>
  );
}
