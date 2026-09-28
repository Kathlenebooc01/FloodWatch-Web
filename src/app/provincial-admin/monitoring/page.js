"use client";

import dynamic from 'next/dynamic'
const FloodWatchMap = dynamic(() => import('@/components/maps/Map'), { ssr: false })
export default function page() {
  return (
    <section>
      <FloodWatchMap/>
    </section>
  )
}
