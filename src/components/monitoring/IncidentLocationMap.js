"use client"

import { Component, useState } from "react"
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox"
import { MapPin } from "lucide-react"
import "mapbox-gl/dist/mapbox-gl.css"
import { DEFAULT_MAPBOX_TOKEN } from "@/lib/constants/mapbox"

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

function IncidentMap({ latitude, longitude, municipality }) {
  const [failed, setFailed] = useState(false)
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || DEFAULT_MAPBOX_TOKEN

  if (!token || failed) {
    return <p className="text-xs text-gray-500 px-3 text-center">{errorMessage}</p>
  }

  return (
    <Map
      initialViewState={{ latitude, longitude, zoom: 13 }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      mapboxAccessToken={token}
      style={{ width: "100%", height: "100%" }}
      onError={() => setFailed(true)}
    >
      <NavigationControl position="top-right" showCompass={false} />
      <Marker latitude={latitude} longitude={longitude} anchor="center">
        <div className="relative size-8">
          <div className="size-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg border-2 border-white">
            <MapPin className="size-5" />
          </div>
          {municipality && (
            <span className="absolute left-full top-1/2 -translate-y-1/2 ml-1 px-2 py-0.5 bg-white/95 rounded-full border border-gray-200 shadow-md text-[10px] font-bold text-gray-800 whitespace-nowrap">
              Assigned municipality: {municipality}
            </span>
          )}
        </div>
      </Marker>
    </Map>
  )
}

export default function IncidentLocationMap({ coordinates, municipality }) {
  if (!coordinates) {
    return <p className="text-xs text-gray-500 px-3 text-center">Location coordinates unavailable.</p>
  }

  return (
    <MapErrorBoundary>
      <IncidentMap {...coordinates} municipality={municipality} />
    </MapErrorBoundary>
  )
}
