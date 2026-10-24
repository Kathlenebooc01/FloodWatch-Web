"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import MapSkeleton from '@/components/skeleton/MapSkeleton';
const HazardMap = dynamic(() => import('@/components/maps/HazardMap'), { 
  ssr: false,
  loading: () => <MapSkeleton />
});
import CardHeader from '@/components/cards/CardHeader';
import CardSubHeader from '@/components/cards/CardSubHeader';

export default function HazardMapPage() {
  return (
    <main className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <aside id="provincial-hazard-indicators" aria-label="Hazard indicators" className="order-1 min-w-0 xl:order-2 xl:sticky xl:top-4 xl:self-start" />
      <div className="order-2 min-w-0 xl:order-1"><HazardMap legendContainerId="provincial-hazard-indicators" /></div>
    </main>
  );
}
