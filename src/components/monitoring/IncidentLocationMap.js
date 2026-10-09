"use client"

import { Component, useEffect, useState } from "react"
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox"
import { MapPin } from "lucide-react"
import "mapbox-gl/dist/mapbox-gl.css"
import { DEFAULT_MAPBOX_TOKEN } from "@/lib/constants/mapbox"
import { supabase } from "@/supabase/util/supabase"
import { getIncidentCoordinates } from "@/lib/reports/incidentCoordinates.mjs"

const errorMessage = "Map could not be loaded. Please try again."

class MapErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? <p className="text-xs text-gray-500 px-3 text-center">{errorMessage}</p> : this.props.children
  }
}

function IncidentMap({ latitude, longitude, municipality, approximate = false, onLocationChange }) {
  const [failed, setFailed] = useState(false)
  const [labelCoordinates, setLabelCoordinates] = useState(null)
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || DEFAULT_MAPBOX_TOKEN
  const markerCoordinates = approximate && labelCoordinates ? labelCoordinates : { latitude, longitude }

  const locateMunicipalityLabel = event => {
    if (!approximate || !municipality || labelCoordinates) return
    const map = event.target
    const layers = map.getStyle()?.layers?.filter(layer => layer.type === 'symbol' &&
      /place|settlement|city|town|village|municipality/i.test(layer.id)).map(layer => layer.id) || []
    if (!layers.length) return
    const normalize = name => String(name || '').toLowerCase().replace(/\b(city|municipality|of)\b/g, '').replace(/[^a-z0-9]/g, '')
    const wanted = normalize(municipality)
    const feature = map.queryRenderedFeatures({ layers }).find(item =>
      item.geometry?.type === 'Point' && normalize(item.properties?.name_en || item.properties?.name) === wanted)
    const coordinates = feature?.geometry?.coordinates
    if (coordinates && Number.isFinite(coordinates[0]) && Number.isFinite(coordinates[1])) {
      const point = { longitude: coordinates[0], latitude: coordinates[1] }
      setLabelCoordinates(point)
      onLocationChange?.(point)
    }
  }

  if (!token || failed) {
    return <p className="text-xs text-gray-500 px-3 text-center">{errorMessage}</p>
  }

  return (
    <Map
      initialViewState={{ latitude, longitude, zoom: approximate ? 10 : 13 }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      mapboxAccessToken={token}
      style={{ width: "100%", height: "100%" }}
      onError={() => setFailed(true)}
      onIdle={locateMunicipalityLabel}
    >
      <NavigationControl position="top-right" showCompass={false} />
      <Marker latitude={markerCoordinates.latitude} longitude={markerCoordinates.longitude} anchor="center">
        <div className="relative size-8">
          <div className={`size-8 rounded-full text-white flex items-center justify-center shadow-lg border-2 border-white ${approximate ? 'bg-blue-600' : 'bg-red-600'}`}>
            <MapPin className="size-5" />
          </div>
          {municipality && (
            <span className="absolute left-full top-1/2 -translate-y-1/2 ml-1 px-2 py-0.5 bg-white/95 rounded-full border border-gray-200 shadow-md text-[10px] font-bold text-gray-800 whitespace-nowrap">
              {approximate ? labelCoordinates ? 'Municipality label' : 'Municipality center' : 'Assigned municipality'}: {municipality}
            </span>
          )}
        </div>
      </Marker>
      {approximate && <div className="absolute bottom-2 left-2 z-10 rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[10px] font-semibold text-gray-800 shadow-sm">
        {municipality ? `${municipality} area` : 'Municipality area'} · Exact incident coordinates unavailable
      </div>}
    </Map>
  )
}

export default function IncidentLocationMap({ coordinates, municipality, municipalityId, onLocationChange }) {
  const [municipalityCoordinates, setMunicipalityCoordinates] = useState(null)
  const [lookupComplete, setLookupComplete] = useState(false)

  useEffect(() => {
    if (coordinates || !municipalityId) return
    let active = true
    supabase.from('municipality_or_city').select('*').eq('municipality_id', municipalityId).single()
      .then(({ data }) => {
        if (!active) return
        const point = getIncidentCoordinates({
          location_point: data?.center_point,
          latitude: data?.center_latitude,
          longitude: data?.center_longitude,
        })
        setMunicipalityCoordinates(point)
        if (point) onLocationChange?.(point)
        setLookupComplete(true)
      }).catch(() => { if (active) setLookupComplete(true) })
    return () => { active = false }
  }, [coordinates, municipalityId, onLocationChange])

  const displayCoordinates = coordinates || municipalityCoordinates
  if (!displayCoordinates) {
    return <p className="text-xs text-gray-500 px-3 text-center">{lookupComplete || !municipalityId ? 'Location coordinates unavailable.' : 'Loading municipality map...'}</p>
  }

  return (
    <MapErrorBoundary>
      <IncidentMap {...displayCoordinates} municipality={municipality} approximate={!coordinates} onLocationChange={onLocationChange} />
    </MapErrorBoundary>
  )
}
