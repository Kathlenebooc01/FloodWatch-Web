"use client";

import dynamic from 'next/dynamic'
import MapSkeleton from '@/components/skeleton/MapSkeleton'
const HeatIndexMap = dynamic(() => import('@/components/maps/HeatIndexMap'), { 
  ssr: false,
  loading: () => <MapSkeleton />
})

export default function HeatIndexMapPage() {
  return (
    <section>
      <HeatIndexMap />
    </section>
  )
}
