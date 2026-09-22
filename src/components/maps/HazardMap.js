"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Map, { Source, Layer, NavigationControl } from 'react-map-gl/mapbox';
import { Waves, Mountain, Compass, Satellite, Building, CloudLightning, Activity, X, ShieldAlert, Maximize2 } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import HazardMapToogleButton from '../monitoring/HazardMapToogleButton';
import HazardVerticalFilter from '../monitoring/HazardVerticalFilter';

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

  // ── Cebu Active Fault Lines State ──
  const [faultLinesData, setFaultLinesData] = useState({ type: 'FeatureCollection', features: [] });
  const [faultSummary, setFaultSummary] = useState(null);
  const [selectedFault, setSelectedFault] = useState(null);
  const [cursor, setCursor] = useState('auto');

  const mapRef = useRef(null);

  const defaultMapStyle = process.env.NEXT_PUBLIC_MAPBOX_STYLE || "mapbox://styles/apex-yoshi/cmp0s3wq700bg01sx2y9i69pw";
  const satelliteMapStyle = "mapbox://styles/mapbox/satellite-streets-v12";
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const landslideTileset = process.env.NEXT_PUBLIC_LANDSLIDE_TILESET;
  const floodTileset = process.env.NEXT_PUBLIC_FLOOD_TILESET;

  // Resolve Storm Surge combined tileset URL
  const stormSurgeTileset = process.env.NEXT_PUBLIC_STORM_SURGE_COMBINE_TILESET_URL?.startsWith('mapbox://')
    ? process.env.NEXT_PUBLIC_STORM_SURGE_COMBINE_TILESET_URL
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

  // Fetch Cebu Active Fault Lines from serverless route
  const fetchFaultLines = useCallback(async () => {
    try {
      const res = await fetch(`/api/earthquake`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.fault_lines) setFaultLinesData(json.fault_lines);
        if (json.summary) setFaultSummary(json.summary);
      }
    } catch (err) {
      console.error("Error fetching Cebu active fault lines:", err);
    }
  }, []);

  useEffect(() => {
    fetchFaultLines();
  }, [fetchFaultLines]);

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

  // Handle map click on fault line trace
  const handleMapClick = (event) => {
    if (activeHazard !== 'earthquake') return;
    const feature = event.features && event.features[0];
    if (feature && feature.layer?.id?.includes('fault')) {
      setSelectedFault({
        properties: feature.properties,
        coordinates: [event.lngLat.lng, event.lngLat.lat]
      });
    } else {
      setSelectedFault(null);
    }
  };

  const interactiveLayerIds = activeHazard === 'earthquake' ? ['fault-lines-main'] : [];

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
                    1, '#FACC15', // Low / Yellow
                    2, '#FB923C', // Moderate / Orange
                    3, '#DC2626', // High / Red
                    '#FACC15'     // Default fallback
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

        {/* ── 4. Cebu Active Fault Lines GeoJSON Layers (PHIVOLCS) ── */}
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

        {/* Row 2: Vertical Hazard Filter Card */}
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
                  PHIVOLCS Active Fault System
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
              <span className="font-bold text-gray-800">{selectedFault.properties.segment}</span>
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
              <span className="text-gray-500 font-medium block mb-1">Municipalities Traversed:</span>
              <p className="text-[11px] text-gray-700 bg-gray-50 p-2 rounded-lg border border-gray-100 font-semibold leading-relaxed">
                {selectedFault.properties.municipalities}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Info Legend Card (Bottom-Right - Eliminates overlap with top-left filter) */}
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
                  : 'Cebu Active Fault Lines'}
              </h4>
              {activeHazard === 'storm-surge' && (
                <span className="text-[11px] text-amber-600 font-semibold block">
                  {SSA_METADATA[activeSSA].title} ({SSA_METADATA[activeSSA].range})
                </span>
              )}
              {activeHazard === 'earthquake' && faultSummary && (
                <span className="text-[11px] text-rose-600 font-semibold block">
                  {faultSummary.total_fault_segments} Active Traces ({faultSummary.total_length_km} km)
                </span>
              )}
            </div>
          </div>
          <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-bold uppercase shrink-0">
            {activeHazard === 'earthquake' ? 'PHIVOLCS' : 'GIS Tileset'}
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
                <span className="text-gray-500 text-[11px] font-medium">VAR 3 (Above human height)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-[#3B82F6]/[0.65] shadow-xs border border-[#1E40AF]" />
                  <span className="text-gray-800 font-bold">0.50 m - 1.50 m</span>
                </div>
                <span className="text-gray-500 text-[11px] font-medium">VAR 2 (Knee to chest)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-[#93C5FD]/[0.65] shadow-xs border border-[#1E40AF]" />
                  <span className="text-gray-800 font-bold">0.10 m - 0.50 m</span>
                </div>
                <span className="text-gray-500 text-[11px] font-medium">VAR 1 (Ankle to knee)</span>
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
                <span className="text-red-700 text-[11px] font-bold">PHIVOLCS Trace</span>
              </div>
              <div className="flex items-center justify-between py-0.5">
                <span className="text-gray-500 font-medium">Primary System</span>
                <span className="text-gray-800 font-bold">Central Cebu (CCFS)</span>
              </div>
              <div className="flex items-center justify-between py-0.5">
                <span className="text-gray-500 font-medium">Total Active Traces</span>
                <span className="text-gray-800 font-bold">7 Major Segments</span>
              </div>
              <div className="flex items-center justify-between py-0.5">
                <span className="text-gray-500 font-medium">Cumulative Length</span>
                <span className="text-gray-800 font-bold">~258.0 km</span>
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
            {activeHazard === 'storm-surge'
              ? `SSA ${activeSSA} Active`
              : activeHazard === 'earthquake'
              ? 'Active Faults Active'
              : isSatellite
              ? 'Satellite + Risk'
              : 'Live Layer Active'}
          </span>
        </div>
      </div>
    </div>
  );
}
