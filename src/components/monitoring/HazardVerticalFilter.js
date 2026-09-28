"use client";

import React, { useState } from 'react';
import { Waves, Mountain, CloudLightning, Activity, Eye, EyeOff, ChevronDown, ChevronUp, Check } from 'lucide-react';

const SSA_DATA = [
  {
    ssa: 1,
    label: 'SSA 1',
    range: '0.5m – 1.0m',
    desc: 'Minor Inundation / Low Threat',
    badgeColor: 'bg-yellow-500',
    borderActive: 'border-yellow-500 bg-yellow-50/90 text-yellow-900',
  },
  {
    ssa: 2,
    label: 'SSA 2',
    range: '1.01m – 2.0m',
    desc: 'Significant Coastal Threat',
    badgeColor: 'bg-orange-500',
    borderActive: 'border-orange-500 bg-orange-50/90 text-orange-900',
  },
  {
    ssa: 3,
    label: 'SSA 3',
    range: '2.01m – 3.0m',
    desc: 'Severe Surge / Evacuate Lowlands',
    badgeColor: 'bg-red-500',
    borderActive: 'border-red-500 bg-red-50/90 text-red-900',
  },
  {
    ssa: 4,
    label: 'SSA 4',
    range: '> 3.0m',
    desc: 'Catastrophic Surge / Extreme Threat',
    badgeColor: 'bg-rose-700',
    borderActive: 'border-rose-700 bg-rose-50/90 text-rose-900',
  },
];

const FLOOD_FILTERS = [
  { id: 'all', label: 'All Flood Zones', desc: 'Display all depth levels', dotColor: 'bg-blue-600' },
  { id: 3, label: 'High Risk (VAR 3)', desc: '> 1.50 m (Above human height)', dotColor: 'bg-[#1D4ED8]' },
  { id: 2, label: 'Moderate Risk (VAR 2)', desc: '0.50 m - 1.50 m (Knee to chest)', dotColor: 'bg-[#3B82F6]' },
  { id: 1, label: 'Low Risk (VAR 1)', desc: '0.10 m - 0.50 m (Ankle to knee)', dotColor: 'bg-[#93C5FD]' },
];

const LANDSLIDE_FILTERS = [
  { id: 'all', label: 'All Landslide Zones', desc: 'Display all slope gradients', dotColor: 'bg-red-600' },
  { id: 3, label: 'High Risk (VAR 3)', desc: '> 35° (Steep Slopes)', dotColor: 'bg-[#DC2626]' },
  { id: 2, label: 'Moderate Risk (VAR 2)', desc: '18° - 35° (Moderate Slopes)', dotColor: 'bg-[#FB923C]' },
  { id: 1, label: 'Low Risk (VAR 1)', desc: '< 18° (Gentle Slopes)', dotColor: 'bg-[#FACC15]' },
];

const CEBU_FAULT_SEGMENTS = [
  { id: 'all', label: 'All Active Fault Lines', length: '198 km', desc: 'Central Cebu Fault System (PHIVOLCS)' },
  { id: 'fault-ccfs-main', label: 'Central Highland Fault (CCFS)', length: '46.2 km', desc: 'Danao - Compostela - Cebu City - Talisay' },
  { id: 'fault-balamban', label: 'Balamban Cordillera Fault', length: '34.5 km', desc: 'Asturias - Balamban - Toledo (North)' },
  { id: 'fault-uling-toledo', label: 'Uling - Masaba Fault', length: '28.4 km', desc: 'Toledo City & City of Naga Corridor' },
  { id: 'fault-lutac-jaclupan', label: 'Lutac - Jaclupan Fault', length: '21.0 km', desc: 'Jaclupan Watershed & Talisay Uplands' },
  { id: 'fault-north-cebu-bogo', label: 'North Cebu Fault', length: '31.8 km', desc: 'San Remigio - Bogo City - Medellin' },
  { id: 'fault-south-cebu-argao', label: 'South Cebu Coastal Segment', length: '36.2 km', desc: 'Sibonga - Argao - Dalaguete Foothills' },
];

export default function HazardVerticalFilter({
  activeHazard,
  activeSSA,
  onSSAChange,
  floodFilter,
  onFloodFilterChange,
  landslideFilter,
  onLandslideFilterChange,
  stormSurgeRiskFilter,
  onStormSurgeRiskFilterChange,
  faultFilter = 'all',
  onFaultFilterChange,
  showLiveEarthquakes = true,
  onToggleLiveEarthquakes,
  telemetry = null,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="w-72 sm:w-80 bg-white/95 backdrop-blur-xl border border-gray-200/80 rounded-2xl shadow-xl overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-top-2">
      {/* Card Header with Collapse Toggle */}
      <div
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-between px-3.5 py-2.5 bg-gray-50/80 border-b border-gray-100 cursor-pointer hover:bg-gray-100/70 transition-colors select-none"
      >
        <div className="flex items-center gap-2">
          {activeHazard === 'flood' ? (
            <Waves className="size-4 text-blue-600 shrink-0" />
          ) : activeHazard === 'landslide' ? (
            <Mountain className="size-4 text-red-600 shrink-0" />
          ) : activeHazard === 'storm-surge' ? (
            <CloudLightning className="size-4 text-amber-600 shrink-0" />
          ) : (
            <Activity className="size-4 text-rose-600 shrink-0" />
          )}
          <div className="flex flex-col">
            <span className="text-xs font-extrabold text-gray-800 leading-tight">
              {activeHazard === 'flood'
                ? 'Flood Risk Filter'
                : activeHazard === 'landslide'
                ? 'Landslide Risk Filter'
                : activeHazard === 'storm-surge'
                ? 'Storm Surge Advisories (SSA)'
                : 'Active Fault Lines Filter'}
            </span>
            <span className="text-[10px] text-gray-500 font-medium">
              {activeHazard === 'storm-surge'
                ? `Active: SSA ${activeSSA} (${SSA_DATA.find(s => s.ssa === activeSSA)?.range})`
                : activeHazard === 'earthquake'
                ? 'PHIVOLCS Active Tectonic Traces'
                : 'Vertical Layer Filtering'}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
          aria-label="Toggle filter panel"
        >
          {isCollapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
        </button>
      </div>

      {/* Vertical Content */}
      {!isCollapsed && (
        <div className="p-2.5 flex flex-col gap-1.5 max-h-[380px] overflow-y-auto">
          {/* 1. Storm Surge Vertical Advisories */}
          {activeHazard === 'storm-surge' && (
            <>
              <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider px-1 pt-1">
                Select Advisory Level
              </div>
              <div className="flex flex-col gap-1.5">
                {SSA_DATA.map((item) => {
                  const isActive = activeSSA === item.ssa;
                  return (
                    <button
                      key={item.ssa}
                      type="button"
                      onClick={() => onSSAChange(item.ssa)}
                      className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left border transition-all cursor-pointer ${
                        isActive
                          ? item.borderActive + ' shadow-sm font-semibold'
                          : 'border-gray-200/60 bg-white/70 hover:bg-gray-50/80 text-gray-700'
                      }`}
                    >
                      <span className={`size-2.5 rounded-full ${item.badgeColor} shrink-0 mt-1.5`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-900">
                            {item.label}
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-white/80 px-1.5 py-0.5 rounded border border-gray-200 text-gray-700">
                            {item.range}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5 font-normal">
                          {item.desc}
                        </p>
                      </div>
                      {isActive && <Check className="size-4 text-amber-600 shrink-0 mt-1" />}
                    </button>
                  );
                })}
              </div>

              {/* Storm Surge Severity Sub-filter */}
              <div className="pt-2 mt-1 border-t border-gray-100">
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                    Severity Tier Filter
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 3, label: 'High (3)' },
                    { id: 2, label: 'Med (2)' },
                    { id: 1, label: 'Low (1)' },
                  ].map((tier) => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => onStormSurgeRiskFilterChange(tier.id)}
                      className={`px-1.5 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer text-center ${
                        stormSurgeRiskFilter === tier.id
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {tier.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 2. Flood Hazard Vertical Filter */}
          {activeHazard === 'flood' && (
            <>
              <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider px-1 pt-1">
                Filter by Inundation Depth
              </div>
              <div className="flex flex-col gap-1.5">
                {FLOOD_FILTERS.map((item) => {
                  const isActive = floodFilter === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onFloodFilterChange(item.id)}
                      className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left border transition-all cursor-pointer ${
                        isActive
                          ? 'border-blue-500 bg-blue-50/90 text-blue-950 shadow-sm font-semibold'
                          : 'border-gray-200/60 bg-white/70 hover:bg-gray-50/80 text-gray-700'
                      }`}
                    >
                      <span className={`size-2.5 rounded-full ${item.dotColor} shrink-0 mt-1.5 border border-blue-900/20`} />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-gray-900 block">
                          {item.label}
                        </span>
                        <p className="text-[11px] text-gray-500 font-normal leading-tight mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                      {isActive && <Check className="size-4 text-blue-600 shrink-0 mt-1" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* 3. Landslide Hazard Vertical Filter */}
          {activeHazard === 'landslide' && (
            <>
              <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider px-1 pt-1">
                Filter by Slope Susceptibility
              </div>
              <div className="flex flex-col gap-1.5">
                {LANDSLIDE_FILTERS.map((item) => {
                  const isActive = landslideFilter === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onLandslideFilterChange(item.id)}
                      className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left border transition-all cursor-pointer ${
                        isActive
                          ? 'border-red-500 bg-red-50/90 text-red-950 shadow-sm font-semibold'
                          : 'border-gray-200/60 bg-white/70 hover:bg-gray-50/80 text-gray-700'
                      }`}
                    >
                      <span className={`size-2.5 rounded-full ${item.dotColor} shrink-0 mt-1.5 border border-red-900/20`} />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-gray-900 block">
                          {item.label}
                        </span>
                        <p className="text-[11px] text-gray-500 font-normal leading-tight mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                      {isActive && <Check className="size-4 text-red-600 shrink-0 mt-1" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* 4. Cebu Active Fault Lines & Live Earthquakes */}
          {activeHazard === 'earthquake' && (
            <>
              {/* Live USGS Earthquakes Layer Toggle */}
              <div className="pb-1 border-b border-gray-100">
                <button
                  type="button"
                  onClick={() => onToggleLiveEarthquakes && onToggleLiveEarthquakes(!showLiveEarthquakes)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                    showLiveEarthquakes
                      ? 'border-red-300 bg-red-50/80 text-red-950 shadow-xs'
                      : 'border-gray-200/80 bg-gray-50/60 text-gray-500 hover:bg-gray-100/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      {showLiveEarthquakes && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      )}
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${showLiveEarthquakes ? 'bg-red-600' : 'bg-gray-400'}`}></span>
                    </span>
                    <div className="text-left">
                      <span className="text-xs font-bold block">Live Earthquakes (USGS)</span>
                      <span className="text-[10px] text-gray-500 font-medium">Real-time seismic feed (Visayas)</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    showLiveEarthquakes ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {showLiveEarthquakes ? 'VISIBLE' : 'HIDDEN'}
                  </span>
                </button>
              </div>

              <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider px-1 pt-1 flex items-center justify-between">
                <span>Active Fault Traces (PHIVOLCS)</span>
                <span className="text-[9px] text-gray-400 font-normal">Central Cebu System</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {CEBU_FAULT_SEGMENTS.map((item) => {
                  const isActive = faultFilter === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onFaultFilterChange && onFaultFilterChange(item.id)}
                      className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left border transition-all cursor-pointer ${
                        isActive
                          ? 'border-rose-500 bg-rose-50/90 text-rose-950 shadow-sm font-semibold'
                          : 'border-gray-200/60 bg-white/70 hover:bg-gray-50/80 text-gray-700'
                      }`}
                    >
                      <span className="size-2.5 rounded-full bg-red-600 shrink-0 mt-1.5 border border-red-900/20" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-900 truncate pr-1">
                            {item.label}
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-white/80 px-1.5 py-0.5 rounded border border-gray-200 text-gray-700 shrink-0">
                            {item.length}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 font-normal leading-tight mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                      {isActive && <Check className="size-4 text-rose-600 shrink-0 mt-1" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
