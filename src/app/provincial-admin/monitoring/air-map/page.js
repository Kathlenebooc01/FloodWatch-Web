"use client";

import dynamic from 'next/dynamic'
import MapSkeleton from '@/components/skeleton/MapSkeleton'
const AirQualityMap = dynamic(() => import('@/components/maps/AirQualityMap'), { 
  ssr: false,
  loading: () => <MapSkeleton />
})

export default function AirMapPage() {
  return (
    <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <aside id="provincial-air-indicators" aria-label="Air quality indicators" className="order-1 min-w-0 xl:order-2 xl:sticky xl:top-4 xl:self-start" />
      <div className="order-2 min-w-0 xl:order-1"><AirQualityMap legendContainerId="provincial-air-indicators" /></div>
    </section>
  )
}
