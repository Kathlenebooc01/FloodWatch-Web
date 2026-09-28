"use client";

import dynamic from 'next/dynamic'
const AirQualityMap = dynamic(() => import('@/components/maps/AirQualityMap'), { ssr: false })

export default function AirMapPage() {
  return (
    <section>
      <AirQualityMap />
    </section>
  )
}
