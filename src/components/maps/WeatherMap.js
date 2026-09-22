"use client";

import React, { useState, useEffect } from 'react';
import Map, { Source, Layer, NavigationControl } from 'react-map-gl/mapbox';
import { Thermometer, Wind, CloudRain, Cloud, Maximize2, Info } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapToggleSwitch from './MapToggleSwitch';
import { supabase } from '@/supabase/util/supabase';

// OpenWeather Tile Map Layers
const WEATHER_LAYERS = [
  { op: 'temp_new', label: 'Temperature', Icon: Thermometer },
  { op: 'wind_new', label: 'Wind speed', Icon: Wind },
  { op: 'precipitation_new', label: 'Precipitation', Icon: CloudRain },
  { op: 'clouds_new', label: 'Clouds', Icon: Cloud },
];

export default function WeatherMap({ activeTab: externalTab, onTabChange: externalOnTabChange, isFullscreen = false }) {
  const [internalTab, setInternalTab] = useState('Observation Feeds');
  const activeTab = externalTab !== undefined ? externalTab : internalTab;
  const handleTabChange = externalOnTabChange || setInternalTab;

  const [activeLayer, setActiveLayer] = useState('temp_new');
  const [lastUpdated, setLastUpdated] = useState(null);

  // Restrict map panning to Cebu & Visayas bounds
  const cebuBounds = [
    [122.00, 8.50],
    [125.50, 12.00]
  ];

  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));

    // Supabase Realtime subscription for weather_telemetry updates
    const channelId = `weather-map-telemetry-${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'weather_telemetry' },
        () => {
          setLastUpdated(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const selectedLayerObj = WEATHER_LAYERS.find((l) => l.op === activeLayer) || WEATHER_LAYERS[0];

  return (
    <div className={`relative w-full ${isFullscreen ? 'h-screen rounded-none' : 'h-screen min-h-[600px] rounded-2xl'} overflow-hidden shadow-sm`}>
      
      {/* ── Top Bar Overlay: Toggle Switch & Maximize Button ── */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-2.5 pointer-events-auto">
        <MapToggleSwitch activeTab={activeTab} onTabChange={handleTabChange} />

        {!isFullscreen && (
          <button
            type="button"
            onClick={() => window.open('/fullscreen-map?view=weather', '_blank')}
            className="flex items-center justify-center bg-white/95 backdrop-blur-md border border-gray-200/90 shadow-md hover:shadow-lg hover:border-gray-300 rounded-xl p-2.5 text-gray-700 hover:text-primary transition-all cursor-pointer select-none"
            title="Open observation feeds in new tab"
            aria-label="Maximize weather map in new tab"
          >
            <Maximize2 className="size-4" />
          </button>
        )}
      </div>
      
      {/* ── Floating Layer Selector ── */}
      <div className="absolute top-20 left-4 z-40 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/90 overflow-hidden" style={{ minWidth: '210px' }}>
        <div className="px-4 py-2.5 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
            Telemetry Layers
          </span>
          <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" /> Live
          </span>
        </div>
        <div className="p-1.5 flex flex-col gap-1">
          {WEATHER_LAYERS.map((layer) => {
            const isActive = activeLayer === layer.op;
            return (
              <button
                key={layer.op}
                onClick={() => setActiveLayer(layer.op)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary/10 text-primary font-bold shadow-xs'
                    : 'text-gray-700 hover:bg-gray-100/80'
                }`}
              >
                <layer.Icon size={17} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-primary' : 'text-gray-500'} />
                <span className="flex-1 text-left">{layer.label}</span>
                {isActive && <span className="size-1.5 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Mapbox Canvas with OpenWeather Raster Tile Layers ── */}
      <Map
        initialViewState={{ latitude: 10.3157, longitude: 123.8854, zoom: 8.5 }}
        maxBounds={cebuBounds}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
        style={{ width: '100%', height: '100%' }}
        scrollZoom={true}
        dragPan={true}
        dragRotate={true}
        doubleClickZoom={true}
        touchZoomRotate={true}
      >
        <NavigationControl position="top-right" />

        {/* Render Active OpenWeather Map Raster Layer */}
        <Source
          key={activeLayer}
          id="openweathermap-weather"
          type="raster"
          tiles={[
            `https://tile.openweathermap.org/map/${activeLayer}/{z}/{x}/{y}.png?appid=${process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY}`
          ]}
          tileSize={256}
        >
          <Layer 
            id="weather-raster-layer" 
            type="raster" 
            paint={{ 
              'raster-opacity': 0.9, 
              'raster-fade-duration': 300 
            }} 
          />
        </Source>
      </Map>

      {/* ── Floating Legend Card (Bottom-Right) ── */}
      <div className="absolute bottom-4 right-4 z-10 hidden sm:block">
        <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-lg border border-gray-200/90 max-w-[280px] transition-all">
          <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-gray-100">
            <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="size-4 text-primary" /> {selectedLayerObj.label} Layer
            </span>
          </div>
          <div className="text-xs text-gray-600">
            <p className="mb-1 font-medium">Realtime OpenWeather raster meteorological layer.</p>
            <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[11px] text-gray-400">
              <span>Updated</span>
              <span className="font-semibold text-gray-600">{lastUpdated || 'Live'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


