"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Map, { Source, Layer, NavigationControl } from 'react-map-gl/mapbox';
import { X, AlertTriangle, MapPin, Calendar, Clock, CheckCircle2, FileText, ImageIcon, ShieldAlert, Layers } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/supabase/util/supabase';
import GeneralCard from '../cards/GeneralCard';
import CardHeader from '../cards/CardHeader';
import CardSubHeader from '../cards/CardSubHeader';
import CardBasedText from '../cards/CardBasedText';

// ─── Layer Style Definitions for GPU Canvas Rendering ──────────────────────
const pinCircleLayer = {
  id: 'incident-pins',
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
    'circle-color': '#800000',
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff',
    'circle-opacity': 0.95,
  }
};

const pinLabelLayer = {
  id: 'incident-labels',
  type: 'symbol',
  layout: {
    'text-field': ['get', 'hazard_type'],
    'text-size': [
      'interpolate',
      ['linear'],
      ['zoom'],
      8, 10,
      11, 11.5,
      14, 13
    ],
    'text-offset': [0, 1.2],
    'text-anchor': 'top',
    'text-optional': true,
  },
  paint: {
    'text-color': '#800000',
    'text-halo-color': '#ffffff',
    'text-halo-width': 1.5,
  }
};

// ─── Universal Coordinate Parser with support for Municipality & Specific Locations ───
const extractCoordinates = (report, muni, specificLoc) => {
  let lat = null;
  let lng = null;

  // 1. Check if specific_location table provided explicit coordinates
  if (specificLoc) {
    lat = parseFloat(specificLoc.latitude ?? specificLoc.center_latitude ?? specificLoc.lat ?? 0);
    lng = parseFloat(specificLoc.longitude ?? specificLoc.center_longitude ?? specificLoc.lng ?? 0);
    if (lat !== 0 && lng !== 0 && !isNaN(lat) && !isNaN(lng)) {
      return { latitude: lat, longitude: lng };
    }
  }

  // 2. Direct latitude/longitude columns if present on the report object
  if (report.latitude != null) lat = parseFloat(report.latitude);
  if (report.longitude != null) lng = parseFloat(report.longitude);

  // 3. Fallback to Municipality center coordinates from municipality_or_city table
  if ((lat == null || isNaN(lat) || lat === 0) && muni) {
    lat = parseFloat(muni.center_latitude ?? muni.latitude ?? 0);
  }
  if ((lng == null || isNaN(lng) || lng === 0) && muni) {
    lng = parseFloat(muni.center_longitude ?? muni.longitude ?? 0);
  }

  return {
    latitude: !isNaN(lat) && lat !== 0 ? lat : null,
    longitude: !isNaN(lng) && lng !== 0 ? lng : null,
  };
};

// ─── Status Badge Helper ──────────────────────────────────────────────────────
const getStatusBadge = (status) => {
  if (!status) return { label: 'Reported', color: 'text-gray-700', bg: 'bg-gray-100', border: 'border-gray-200' };
  const s = status.toLowerCase();
  if (s === 'resolved' || s === 'verified' || s === 'completed' || s === 'approved') {
    return { label: status, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' };
  }
  if (s === 'pending' || s === 'under review' || s === 'in progress' || s === 'investigating') {
    return { label: status, color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' };
  }
  if (s === 'rejected' || s === 'false alarm' || s === 'dismissed' || s === 'critical' || s === 'emergency') {
    return { label: status, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' };
  }
  return { label: status, color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' };
};

// ─── Popup Row helper ────────────────────────────────────────────────────────
const Row = ({ icon, label, value }) => (
  <div className="flex items-start gap-2.5 my-1.5 py-1.5 border-b border-gray-100 last:border-0">
    <span className="text-gray-500 mt-0.5 shrink-0">{icon}</span>
    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
      <span className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider">{label}</span>
      <span className="font-medium text-sm text-gray-800 break-words">
        {value || '—'}
      </span>
    </div>
  </div>
);

export default function ReportMapTracker() {
  const [incidents, setIncidents] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [cursor, setCursor] = useState('auto');

  useEffect(() => {
    // 1. Fetch incident reports along with municipality and potential specific location tables
    const fetchData = async () => {
      const [incidentsRes, munisRes, specRes, specPluralRes] = await Promise.all([
        supabase.from('incident_report').select('*').order('created_at', { ascending: false }),
        supabase.from('municipality_or_city').select('*'),
        supabase.from('specific_location').select('*').then(r => r.error ? { data: [] } : r),
        supabase.from('specific_locations').select('*').then(r => r.error ? { data: [] } : r)
      ]);

      if (incidentsRes.error) {
        console.error("🚨 Supabase Error fetching incident_report 🚨:", incidentsRes.error.message);
        return;
      }
      if (munisRes.error) {
        console.error("🚨 Supabase Error fetching municipalities for incident map 🚨:", munisRes.error.message);
      }

      const reports = incidentsRes.data || [];
      const munis = munisRes.data || [];
      const specificLocs = [...(specRes.data || []), ...(specPluralRes.data || [])];

      // Track occurrences of identical GPS points to prevent marker stacking!
      const coordCounts = {};

      const processed = reports.map((rep, index) => {
        const matchingMuni = munis.find((m) => (m.municipality_id || m.id) === rep.municipality_id) || null;
        const matchingSpecific = specificLocs.find((s) => (s.id || s.specific_location_id || s.location_id) === rep.specific_location_id) || null;

        const coords = extractCoordinates(rep, matchingMuni, matchingSpecific);
        let finalLat = coords.latitude;
        let finalLng = coords.longitude;

        // If multiple incidents land on the exact same coordinate (e.g. same town center),
        // apply a subtle deterministic spiral offset so every incident pin is individually clickable and visible!
        if (finalLat != null && finalLng != null) {
          const key = `${finalLat.toFixed(4)}_${finalLng.toFixed(4)}`;
          if (coordCounts[key] !== undefined) {
            const count = coordCounts[key];
            const angle = count * (Math.PI / 3); // 60 degrees step
            const radius = 0.004 + (Math.floor(count / 6) * 0.005); // radial outward step
            finalLat += Math.sin(angle) * radius;
            finalLng += Math.cos(angle) * radius;
            coordCounts[key]++;
          } else {
            coordCounts[key] = 1;
          }
        }

        return {
          ...rep,
          latitude: finalLat,
          longitude: finalLng,
          municipality_name: matchingSpecific?.name || matchingSpecific?.location_name || matchingMuni?.name || "Unknown Location",
        };
      });

      console.log("📍 [ReportMapTracker Debug] Loaded incidents:", processed.length, "| Displayable pins:", processed.filter(p => p.latitude != null && p.longitude != null).length, processed);
      setIncidents(processed);
    };

    fetchData();

    // 2. Realtime: Subscribe to incident_report inserts and updates
    const incidentsChannel = supabase
      .channel('realtime-incident-map')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incident_report' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(incidentsChannel);
    };
  }, []);

  // ── Step 1: Memoized GeoJSON FeatureCollection ─────────────────────────────
  const geojsonData = useMemo(() => {
    const features = incidents
      .filter(
        (m) =>
          m.latitude != null &&
          m.longitude != null &&
          isFinite(m.latitude) &&
          isFinite(m.longitude)
      )
      .map((rep) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [rep.longitude, rep.latitude],
        },
        properties: {
          ...rep,
        },
      }));

    return {
      type: 'FeatureCollection',
      features,
    };
  }, [incidents]);

  // ── Step 5: Handle Map Canvas Click ───────────────────────────────────────
  const handleMapClick = useCallback((event) => {
    const feature = event.features && event.features[0];
    if (feature) {
      const repId = feature.properties?.report_id;
      const matchedReport = incidents.find(
        (r) => String(r.report_id) === String(repId)
      ) || feature.properties;

      setSelectedReport(matchedReport);
    }
  }, [incidents]);

  const handleMouseEnter = useCallback(() => setCursor('pointer'), []);
  const handleMouseLeave = useCallback(() => setCursor('auto'), []);

  const activeStatus = selectedReport ? getStatusBadge(selectedReport.status) : null;
  const mappedCount = geojsonData.features.length;

  return (
    <div className="relative w-full h-[85vh] xl:h-screen min-h-[600px] rounded-2xl overflow-hidden shadow-sm border border-gray-200/80">

      {/* ── Mapbox Canvas with WebGL GPU Rendering ── */}
      <Map
        initialViewState={{ latitude: 10.3157, longitude: 123.8854, zoom: 8.5 }}
        mapStyle="mapbox://styles/apex-yoshi/cmp0s3wq700bg01sx2y9i69pw"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
        style={{ width: '100%', height: '100%' }}
        interactiveLayerIds={['incident-pins']}
        onClick={handleMapClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        cursor={cursor}
      >
        <NavigationControl position="top-right" />

        {/* ── Step 3 & 4: Single GeoJSON Source + GPU Circle & Symbol Layers ── */}
        <Source id="incident-reports-source" type="geojson" data={geojsonData} cluster={false}>
          <Layer {...pinCircleLayer} />
          <Layer {...pinLabelLayer} />
        </Source>
      </Map>

      {/* ── Floating Stats Overlay (Bottom-Right) ── */}
      <div className="absolute bottom-4 right-4 z-10 hidden sm:block">
        <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-lg border border-gray-200 min-w-[220px] max-w-[280px] transition-all">
          <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="size-4 text-maroon shrink-0" style={{ color: '#800000' }} />
              <span className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">
                Incident Tracker
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="text-gray-600 text-xs">Mapped Reports:</span>
            <span className="bg-rose-950/10 text-rose-900 font-bold px-2.5 py-0.5 rounded-full text-xs">
              {mappedCount}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-gray-100 text-[11px] font-medium text-gray-500">
            <span className="size-2.5 rounded-full inline-block shrink-0 shadow-xs" style={{ backgroundColor: '#800000' }} />
            <span className="truncate">Pin Color: Maroon</span>
          </div>
        </div>
      </div>

      {/* ── Floating Detail Panel (Top-Left) ── */}
      {selectedReport && (
        <div className="absolute top-4 left-4 z-20 w-[300px] md:w-[350px] bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden transition-all animate-slide-left">
          <GeneralCard className="p-0 border-none shadow-none">
            
            {/* Panel Header */}
            <div className="p-4 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between gap-2">
              <div className="truncate pr-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-5 text-maroon shrink-0" style={{ color: '#800000' }} />
                  <CardHeader className="text-gray-800 capitalize text-lg font-extrabold truncate">
                    {selectedReport.hazard_type || "Incident Report"}
                  </CardHeader>
                </div>
                <CardBasedText className="text-gray-400 text-xs flex items-center gap-1 mt-0.5">
                  <MapPin className="size-3.5 text-primary shrink-0" />
                  <span className="truncate">{selectedReport.municipality_name}</span>
                </CardBasedText>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="modal-icon-button bg-gray-200/60 hover:bg-gray-200 shrink-0"
                aria-label="Close panel"
              >
                <X className="size-5 text-gray-500" />
              </button>
            </div>

            {/* Panel Body */}
            <div className="p-4 grid gap-4 max-h-[75vh] overflow-y-auto">
              
              {/* Status Banner */}
              <div className={`px-3 py-2 rounded-xl flex items-center justify-between border ${activeStatus.bg} ${activeStatus.border}`}>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                  Report Status
                </span>
                <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full capitalize bg-white/80 border ${activeStatus.border} ${activeStatus.color}`}>
                  {activeStatus.label}
                </span>
              </div>

              {/* Image Preview if available */}
              {selectedReport.image_url && (
                <div className="rounded-xl overflow-hidden border border-gray-200/80 bg-gray-100 max-h-48 relative group">
                  <img 
                    src={selectedReport.image_url} 
                    alt="Incident attachment" 
                    className="w-full h-full object-cover max-h-48 transition-transform group-hover:scale-105"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                    <ImageIcon className="size-3" /> Attached Image
                  </div>
                </div>
              )}

              {/* Description & Incident Details */}
              <div className="bg-gray-50/60 rounded-xl p-3 border border-gray-100">
                <Row 
                  icon={<FileText className="size-4 text-primary" />} 
                  label="Incident Description" 
                  value={selectedReport.description || "No specific description provided for this incident."} 
                />
                <Row 
                  icon={<Calendar className="size-4 text-primary" />} 
                  label="Reported At" 
                  value={selectedReport.created_at ? new Date(selectedReport.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown'} 
                />
                {selectedReport.reviewed_at && (
                  <Row 
                    icon={<CheckCircle2 className="size-4 text-green-600" />} 
                    label="Verified & Reviewed At" 
                    value={new Date(selectedReport.reviewed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 
                  />
                )}
              </div>

            </div>
          </GeneralCard>
        </div>
      )}
    </div>
  );
}
