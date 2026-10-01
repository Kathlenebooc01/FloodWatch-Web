"use client";

import dynamic from 'next/dynamic'
import MapSkeleton from '@/components/skeleton/MapSkeleton'
const FloodWatchMap = dynamic(() => import('@/components/maps/Map'), { 
  ssr: false, 
  loading: () => <MapSkeleton /> 
})
export default function page() {
  return (
    <section>
      <FloodWatchMap/>
    </section>
  )
}
