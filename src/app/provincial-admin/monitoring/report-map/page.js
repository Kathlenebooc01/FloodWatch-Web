"use client";

import dynamic from 'next/dynamic'
import MapSkeleton from '@/components/skeleton/MapSkeleton'
const ReportMapTracker = dynamic(() => import('@/components/maps/ReportMapTracker'), { 
  ssr: false,
  loading: () => <MapSkeleton />
})

export default function ReportMapPage() {
  return (
    <section>
      <ReportMapTracker />
    </section>
  )
}
