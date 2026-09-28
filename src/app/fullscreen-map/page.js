"use client";

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import MapSkeleton from '@/components/skeleton/MapSkeleton';

const Map = dynamic(() => import('@/components/maps/Map'), { ssr: false });
const AirQualityMap = dynamic(() => import('@/components/maps/AirQualityMap'), { ssr: false });
const HeatIndexMap = dynamic(() => import('@/components/maps/HeatIndexMap'), { ssr: false });
const HazardMap = dynamic(() => import('@/components/maps/HazardMap'), { ssr: false });
const WeatherMap = dynamic(() => import('@/components/maps/WeatherMap'), { ssr: false });

function FullscreenMapContent() {
  const searchParams = useSearchParams();
  const view = searchParams.get('view') || 'risk';

  return (
    <main className="w-screen h-screen m-0 p-0 overflow-hidden bg-gray-900 relative">
      <Suspense fallback={<MapSkeleton />}>
        {view === 'air' && <AirQualityMap isFullscreen={true} />}
        {view === 'heat-index' && <HeatIndexMap isFullscreen={true} />}
        {view === 'hazard' && <HazardMap isFullscreen={true} />}
        {view === 'weather' && <WeatherMap isFullscreen={true} />}
        {view === 'risk' && <Map isFullscreen={true} />}
      </Suspense>
    </main>
  );
}

export default function FullscreenMapPage() {
  return (
    <Suspense fallback={<MapSkeleton />}>
      <FullscreenMapContent />
    </Suspense>
  );
}
