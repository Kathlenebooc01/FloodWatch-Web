"use client";

import dynamic from 'next/dynamic'
const ReportMapTracker = dynamic(() => import('@/components/maps/ReportMapTracker'), { ssr: false })

export default function ReportMapPage() {
  return (
    <section>
      <ReportMapTracker />
    </section>
  )
}
