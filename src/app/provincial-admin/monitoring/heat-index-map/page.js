"use client";

import dynamic from 'next/dynamic'
const HeatIndexMap = dynamic(() => import('@/components/maps/HeatIndexMap'), { ssr: false })

export default function HeatIndexMapPage() {
  return (
    <section>
      <HeatIndexMap />
    </section>
  )
}
