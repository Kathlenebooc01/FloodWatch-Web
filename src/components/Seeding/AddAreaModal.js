"use client"

import { useState, useEffect, useMemo } from 'react'
import SideModal from "../Modal/SideModal"
import CardSubHeader from "../cards/CardSubHeader"
import CardBasedText from "../cards/CardBasedText"
import PrimaryButton from "../button/PrimaryButton"
import GeneralInput from "../forms/GeneralInput"
import { 
  X, 
  MapPin, 
  Building2, 
  Compass, 
  Loader2, 
  ChevronDown, 
  Check, 
  Search, 
  Crosshair,
  Layers,
  Sparkles,
  ShieldAlert
} from "lucide-react"
import { supabase } from '@/supabase/util/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'

// Helper: Generate a bounding polygon in WKT and GeoJSON format
function createGeofence(lng, lat, delta = 0.04) {
  const minLng = Number((lng - delta).toFixed(10));
  const maxLng = Number((lng + delta).toFixed(10));
  const minLat = Number((lat - delta).toFixed(10));
  const maxLat = Number((lat + delta).toFixed(10));

  const wkt = `POLYGON((${minLng} ${minLat}, ${maxLng} ${minLat}, ${maxLng} ${maxLat}, ${minLng} ${maxLat}, ${minLng} ${minLat}))`;
  
  const geojson = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [minLng, minLat],
        [maxLng, minLat],
        [maxLng, maxLat],
        [minLng, maxLat],
        [minLng, minLat]
      ]]
    }
  };

  return { wkt, geojson };
}

export default function AddAreaModal() {
  const router = useRouter()
  const [provinces, setProvinces] = useState([])
  const [selectedProvinceId, setSelectedProvinceId] = useState("")
  const [newProvinceName, setNewProvinceName] = useState("")
  const [isNewProvince, setIsNewProvince] = useState(false)

  // Custom Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [provinceSearch, setProvinceSearch] = useState("")

  const [municipalityName, setMunicipalityName] = useState("")
  const [latitude, setLatitude] = useState("8.9475")
  const [longitude, setLongitude] = useState("125.5406")

  // PostGIS Geography fields
  const [centerPoint, setCenterPoint] = useState("POINT(125.540600 8.947500)")
  const [boundaryGeofence, setBoundaryGeofence] = useState("")
  const [boundaryRadiusKm, setBoundaryRadiusKm] = useState(5) // approx 5km radius (0.045 deg)

  const [viewState, setViewState] = useState({
    latitude: 8.9475,
    longitude: 125.5406,
    zoom: 11
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize and auto-sync boundary geofence on coordinates change
  useEffect(() => {
    const latNum = parseFloat(latitude) || 8.9475;
    const lngNum = parseFloat(longitude) || 125.5406;
    const delta = (boundaryRadiusKm * 0.009); // 1km approx 0.009 degrees
    const { wkt } = createGeofence(lngNum, latNum, delta);
    setCenterPoint(`POINT(${lngNum.toFixed(10)} ${latNum.toFixed(10)})`);
    setBoundaryGeofence(wkt);
  }, [latitude, longitude, boundaryRadiusKm]);

  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const { data } = await supabase.from('province').select('province_id, name').order('name')
        if (data) setProvinces(data)
      } catch (err) {
        console.error("Error loading provinces:", err)
      }
    }
    fetchProvinces()
  }, [])

  const handleLatChange = (val) => {
    const cleanVal = val.replace(/[^0-9.-]/g, "")
    setLatitude(cleanVal)
    const parsedLat = parseFloat(cleanVal)
    if (!isNaN(parsedLat) && parsedLat >= -90 && parsedLat <= 90) {
      setViewState(prev => ({ ...prev, latitude: parsedLat }))
    }
  }

  const handleLngChange = (val) => {
    const cleanVal = val.replace(/[^0-9.-]/g, "")
    setLongitude(cleanVal)
    const parsedLng = parseFloat(cleanVal)
    if (!isNaN(parsedLng) && parsedLng >= -180 && parsedLng <= 180) {
      setViewState(prev => ({ ...prev, longitude: parsedLng }))
    }
  }

  const handleMarkerDragEnd = (evt) => {
    const newLat = evt.lngLat.lat
    const newLng = evt.lngLat.lng
    setLatitude(newLat.toFixed(10))
    setLongitude(newLng.toFixed(10))
    setViewState(prev => ({
      ...prev,
      latitude: newLat,
      longitude: newLng
    }))
  }

  const handleCenterPointChange = (val) => {
    setCenterPoint(val);
    // Try to parse POINT(lng lat)
    const match = val.match(/POINT\s*\(\s*([0-9.-]+)\s+([0-9.-]+)\s*\)/i);
    if (match) {
      const parsedLng = parseFloat(match[1]);
      const parsedLat = parseFloat(match[2]);
      if (!isNaN(parsedLng) && !isNaN(parsedLat)) {
        setLongitude(parsedLng.toFixed(10));
        setLatitude(parsedLat.toFixed(10));
        setViewState(prev => ({ ...prev, latitude: parsedLat, longitude: parsedLng }));
      }
    }
  };

  const handleAutoGenerateGeofence = () => {
    const latNum = parseFloat(latitude) || 8.9475;
    const lngNum = parseFloat(longitude) || 125.5406;
    const delta = (boundaryRadiusKm * 0.009);
    const { wkt } = createGeofence(lngNum, latNum, delta);
    setBoundaryGeofence(wkt);
  };

  // Convert WKT boundary to GeoJSON for Mapbox visual rendering
  const boundaryGeoJson = useMemo(() => {
    const latNum = parseFloat(latitude) || 8.9475;
    const lngNum = parseFloat(longitude) || 125.5406;
    const delta = (boundaryRadiusKm * 0.009);
    
    // Try parsing user's boundaryGeofence string if WKT
    if (boundaryGeofence && boundaryGeofence.startsWith('POLYGON')) {
      const match = boundaryGeofence.match(/\(\(\s*(.*?)\s*\)\)/);
      if (match && match[1]) {
        const pairs = match[1].split(',').map(pair => {
          const [x, y] = pair.trim().split(/\s+/).map(Number);
          return [x, y];
        }).filter(coord => !isNaN(coord[0]) && !isNaN(coord[1]));

        if (pairs.length >= 4) {
          return {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [pairs]
            }
          };
        }
      }
    }

    return createGeofence(lngNum, latNum, delta).geojson;
  }, [latitude, longitude, boundaryRadiusKm, boundaryGeofence]);

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!municipalityName.trim()) {
      alert("Please enter a municipality or city name.")
      return
    }

    const latNum = parseFloat(latitude)
    const lngNum = parseFloat(longitude)

    if (isNaN(latNum) || isNaN(lngNum)) {
      alert("Please enter valid numeric latitude and longitude values.")
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch('/api/seeding/add-area', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          province_id: selectedProvinceId,
          new_province_name: newProvinceName,
          is_new_province: isNewProvince,
          name: municipalityName.trim(),
          latitude: latNum,
          longitude: lngNum,
          center_point: centerPoint,
          boundary_geofence: boundaryGeofence
        })
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to add area record.');
      }

      router.push('/national-admin/seeding')
      router.refresh()
    } catch (err) {
      console.error("Failed to add area:", err)
      alert(err.message || "Failed to add area record.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentLat = parseFloat(latitude) || 8.9475
  const currentLng = parseFloat(longitude) || 125.5406

  const selectedProvinceObj = provinces.find(p => p.province_id === selectedProvinceId)
  const filteredProvinces = provinces.filter(p => 
    p.name.toLowerCase().includes(provinceSearch.toLowerCase().trim())
  )

  // PSGC API Integration
  const [psgcProvinces, setPsgcProvinces] = useState([])
  const [isFetchingGeocode, setIsFetchingGeocode] = useState(false)

  useEffect(() => {
    // Fetch official PSGC provinces for the "New Province" dropdown
    fetch('https://psgc.gitlab.io/api/provinces/')
      .then(res => res.json())
      .then(data => {
        // Sort alphabetically
        data.sort((a, b) => a.name.localeCompare(b.name));
        setPsgcProvinces(data);
      })
      .catch(err => console.error("PSGC API Error:", err));
  }, [])

  // Geocoding API Integration using Mapbox
  const handleGeocode = async () => {
    if (!municipalityName.trim()) {
      alert("Please enter a municipality name to search.");
      return;
    }
    
    if (!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) {
      alert("Mapbox API token is missing in .env.local");
      return;
    }

    const provName = isNewProvince ? newProvinceName : (selectedProvinceObj?.name || "");
    const query = `${municipalityName}, ${provName}, Philippines`;

    setIsFetchingGeocode(true);
    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}&country=ph`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Mapbox API Error. Please check your API token.");
      }

      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        setLatitude(lat.toFixed(10));
        setLongitude(lng.toFixed(10));
        setViewState(prev => ({ ...prev, latitude: lat, longitude: lng }));
      } else {
        alert(`Could not find coordinates for "${query}". Try refining the name.`);
      }
    } catch (err) {
      console.error("Geocoding API Error:", err);
      alert(err.message || "Failed to fetch geocoding data.");
    } finally {
      setIsFetchingGeocode(false);
    }
  };

  return (
    <SideModal>
      {/* Modal Header */}
      <div className="flex justify-between items-center sticky top-0 bg-white p-4 border-b border-gray-100 z-10">
        <div>
          <CardSubHeader className="text-lg text-primary">Add New Seeding Area</CardSubHeader>
          <CardBasedText className="text-xs text-gray-400 font-medium mt-0.5">
            Register municipality with PostGIS center point & boundary geofence
          </CardBasedText>
        </div>
        <Link href="/national-admin/seeding" className="hover:bg-gray-100 p-1.5 rounded-full transition-colors cursor-pointer">
          <X className="size-5 text-gray-500" />
        </Link>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-4 grid gap-5 overflow-y-auto">
        
        {/* Styled Province Dropdown Section */}
        <div className="grid gap-2 p-3 bg-gray-50/70 rounded-xl border border-gray-100 relative">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 font-semibold text-xs text-gray-700">
              <MapPin className="size-4 text-primary" />
              <span>Province Name *</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsNewProvince(!isNewProvince)
                setIsDropdownOpen(false)
              }}
              className="text-[11px] text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              {isNewProvince ? "Select Existing Province" : "+ Create New Province"}
            </button>
          </div>

          {isNewProvince ? (
            <div className="grid gap-1 relative">
              <select
                value={newProvinceName}
                onChange={(e) => setNewProvinceName(e.target.value)}
                className="w-full bg-white text-xs text-gray-800 border border-gray-200 rounded-xl p-3 shadow-2xs hover:border-primary transition-colors cursor-pointer focus:outline-primary appearance-none"
                required
              >
                <option value="" disabled>Select official PSGC province...</option>
                {psgcProvinces.map(prov => (
                  <option key={prov.code} value={prov.name}>{prov.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-500 pointer-events-none" />
              <span className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                <Sparkles className="size-3 text-amber-500" /> Powered by Philippine Standard Geographic Code (PSGC) API
              </span>
            </div>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between bg-white text-xs text-gray-800 border border-gray-200 rounded-xl p-3 shadow-2xs hover:border-primary transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-primary opacity-70" />
                  <span className={selectedProvinceObj ? "font-semibold text-gray-800" : "text-gray-400"}>
                    {selectedProvinceObj ? selectedProvinceObj.name : "Select Province from Database"}
                  </span>
                </div>
                <ChevronDown className={`size-4 text-gray-500 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Custom Styled Dropdown Popover */}
              {isDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-gray-200 shadow-xl z-30 overflow-hidden max-h-60 flex flex-col">
                  <div className="p-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                    <Search className="size-3.5 text-gray-400 shrink-0" />
                    <input
                      type="text"
                      value={provinceSearch}
                      onChange={(e) => setProvinceSearch(e.target.value)}
                      placeholder="Search provinces..."
                      className="w-full bg-transparent text-xs outline-0"
                    />
                  </div>

                  <div className="overflow-y-auto max-h-48 p-1">
                    {filteredProvinces.length > 0 ? (
                      filteredProvinces.map((p) => {
                        const isSelected = p.province_id === selectedProvinceId
                        return (
                          <button
                            key={p.province_id}
                            type="button"
                            onClick={() => {
                              setSelectedProvinceId(p.province_id)
                              setIsDropdownOpen(false)
                            }}
                            className={`w-full flex items-center justify-between text-left text-xs p-2.5 rounded-lg transition-colors cursor-pointer ${
                              isSelected ? "bg-primary/10 text-primary font-bold" : "hover:bg-gray-100 text-gray-700"
                            }`}
                          >
                            <span>{p.name}</span>
                            {isSelected && <Check className="size-4 text-primary" />}
                          </button>
                        )
                      })
                    ) : (
                      <div className="p-3 text-center text-xs text-gray-400">
                        No provinces matching "{provinceSearch}"
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Municipality / City Name with Geocoding */}
        <div className="grid gap-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-xs text-gray-700">
              <Building2 className="size-4 text-primary" />
              <span>Municipality / City Name *</span>
            </div>
            <button
              type="button"
              onClick={handleGeocode}
              disabled={isFetchingGeocode || !municipalityName}
              className="text-[10px] text-white bg-primary hover:bg-primary-dark px-2 py-1 rounded-md font-bold transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              {isFetchingGeocode ? <Loader2 className="size-3 animate-spin" /> : <Search className="size-3" />}
              Geocode Location
            </button>
          </div>
          <GeneralInput
            value={municipalityName}
            onChange={(e) => setMunicipalityName(e.target.value)}
            placeholder="e.g. Butuan City"
            required
          />
          <span className="text-[10px] text-gray-400 flex items-center gap-1">
            <Sparkles className="size-3 text-amber-500" /> Type name and click "Geocode Location" to auto-fetch Mapbox Coordinates
          </span>
        </div>

        {/* Interactive Mapbox Map with Point Marker & Geofence Boundary */}
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center font-semibold gap-2">
              <Compass className="text-primary size-4" />
              <CardSubHeader>Visual Geofence Map</CardSubHeader>
            </div>
            <span className="text-[11px] text-primary font-semibold flex items-center gap-1">
              <Crosshair className="size-3" /> Drag pin to reposition geofence
            </span>
          </div>

          <div className="h-60 w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm relative group">
            {process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ? (
              <Map
                {...viewState}
                onMove={evt => setViewState(evt.viewState)}
                style={{ width: '100%', height: '100%' }}
                mapStyle="mapbox://styles/apex-yoshi/cmp0s3wq700bg01sx2y9i69pw"
                mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
              >
                <NavigationControl position="top-right" />

                {/* Render Boundary Geofence Polygon Layer */}
                <Source id="boundary-geofence-source" type="geojson" data={boundaryGeoJson}>
                  <Layer
                    id="boundary-geofence-fill"
                    type="fill"
                    paint={{
                      'fill-color': '#0035A9',
                      'fill-opacity': 0.18
                    }}
                  />
                  <Layer
                    id="boundary-geofence-line"
                    type="line"
                    paint={{
                      'line-color': '#0035A9',
                      'line-width': 2.5,
                      'line-dasharray': [2, 2]
                    }}
                  />
                </Source>
                
                <Marker
                  latitude={currentLat}
                  longitude={currentLng}
                  anchor="bottom"
                  draggable
                  onDragEnd={handleMarkerDragEnd}
                >
                  <div className="relative group cursor-pointer">
                    <div className="bg-primary text-white p-2 rounded-full shadow-lg border-2 border-white transform transition-transform group-hover:scale-110 flex items-center justify-center">
                      <MapPin className="size-5 text-white" />
                    </div>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rotate-45" />
                  </div>
                </Marker>
              </Map>
            ) : (
              <div className="flex flex-col items-center justify-center h-full bg-gray-50 text-gray-500 text-xs p-4 text-center">
                <ShieldAlert className="size-8 text-amber-500 mb-2" />
                <span className="font-bold text-gray-700">Mapbox Token Missing</span>
                <span>Please add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to your .env.local file to view the map.</span>
              </div>
            )}

            {/* Coordinate Overlay Badge */}
            <div className="absolute bottom-2 left-2 z-10 bg-black/70 backdrop-blur-md text-white text-[11px] font-mono px-3 py-1.5 rounded-lg shadow-md flex items-center gap-2">
              <span className="text-emerald-400 font-bold">Lat:</span> {currentLat.toFixed(10)}
              <span className="text-emerald-400 font-bold">Lng:</span> {currentLng.toFixed(10)}
            </div>
          </div>
        </div>

        {/* Latitude and Longitude Input Fields */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50/70 rounded-xl border border-gray-100">
          <div className="grid gap-1">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-gray-700">
              <Compass className="size-3.5 text-primary" />
              <span>Center Latitude *</span>
            </div>
            <GeneralInput
              value={latitude}
              onChange={(e) => handleLatChange(e.target.value)}
              type="text"
              inputMode="decimal"
              placeholder="8.9475"
              required
            />
          </div>

          <div className="grid gap-1">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-gray-700">
              <Compass className="size-3.5 text-primary" />
              <span>Center Longitude *</span>
            </div>
            <GeneralInput
              value={longitude}
              onChange={(e) => handleLngChange(e.target.value)}
              type="text"
              inputMode="decimal"
              placeholder="125.5406"
              required
            />
          </div>
        </div>

        {/* ── PostGIS Geography Inputs (Center Point & Boundary Geofence) ── */}
        <div className="grid gap-3 p-3.5 bg-blue-50/50 rounded-xl border border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xs text-blue-900">
              <Layers className="size-4 text-primary" />
              <span>PostGIS Geography Specifications</span>
            </div>
            <button
              type="button"
              onClick={handleAutoGenerateGeofence}
              className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="size-3" /> Auto-Generate
            </button>
          </div>

          {/* Center Point Input */}
          <div className="grid gap-1">
            <label className="text-[11px] font-semibold text-gray-700 flex items-center justify-between">
              <span>Center Point (WKT Point)</span>
              <span className="text-gray-400 font-mono text-[10px]">POINT(lng lat)</span>
            </label>
            <input
              type="text"
              value={centerPoint}
              onChange={(e) => handleCenterPointChange(e.target.value)}
              placeholder="POINT(125.540600 8.947500)"
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs font-mono text-gray-800 focus:outline-primary"
              required
            />
          </div>

          {/* Boundary Geofence Input */}
          <div className="grid gap-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-gray-700">
                Boundary Geofence (WKT Polygon)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500">Radius:</span>
                <select
                  value={boundaryRadiusKm}
                  onChange={(e) => setBoundaryRadiusKm(Number(e.target.value))}
                  className="bg-white border border-gray-200 rounded text-[11px] px-1.5 py-0.5 text-gray-700 font-bold"
                >
                  <option value={3}>3 km</option>
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={15}>15 km</option>
                </select>
              </div>
            </div>
            <textarea
              rows={2}
              value={boundaryGeofence}
              onChange={(e) => setBoundaryGeofence(e.target.value)}
              placeholder="POLYGON((lng1 lat1, lng2 lat2, ...))"
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-[11px] font-mono text-gray-800 focus:outline-primary resize-none"
              required
            />
          </div>
        </div>

        {/* Submit Footer */}
        <div className="pt-3 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white z-10">
          <Link
            href="/national-admin/seeding"
            className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
          >
            Cancel
          </Link>
          <PrimaryButton type="submit" disabled={isSubmitting} className="flex items-center gap-2">
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {isSubmitting ? "Adding Area..." : "Register Area & Geofence"}
          </PrimaryButton>
        </div>
      </form>
    </SideModal>
  )
}
