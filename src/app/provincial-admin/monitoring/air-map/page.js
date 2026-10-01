"use client";

import dynamic from 'next/dynamic'
import MapSkeleton from '@/components/skeleton/MapSkeleton'
const AirQualityMap = dynamic(() => import('@/components/maps/AirQualityMap'), { 
  ssr: false,
  loading: () => <MapSkeleton />
})

export default function AirMapPage() {
  return (
    <section>
      <AirQualityMap />
    </section>
  )
}
