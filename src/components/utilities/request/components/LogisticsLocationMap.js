"use client"
import Map, { Marker } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'

export default function LogisticsLocationMap({ 
  longitude = 125.5406, 
  latitude = 8.9475,
  zoom = 13 
}) {
  return (
    <div className="w-full h-[250px] rounded-xl overflow-hidden border border-gray-200 shadow-sm relative">
      <Map
        initialViewState={{
          longitude,
          latitude,
          zoom
        }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
        dragPan={false}
        scrollZoom={false}
        doubleClickZoom={false}
        touchZoomRotate={false}
        keyboard={false}
        dragRotate={false}
        attributionControl={false}
      >
        <Marker longitude={longitude} latitude={latitude} anchor="center">
          <div className="map-pin-icon-default"></div>
        </Marker>
      </Map>
      
      {/* Optional overlay gradient to make it look like a seamless card component */}
      <div className="absolute inset-0 pointer-events-none rounded-xl shadow-[inset_0_0_15px_rgba(0,0,0,0.05)]"></div>
    </div>
  )
}
