"use client";

import React, { Suspense, lazy } from 'react';
import { useSearchParams } from 'next/navigation';
import MapSkeleton from '@/components/skeleton/MapSkeleton';

const Map = lazy(() => import('@/components/maps/Map'));
const AirQualityMap = lazy(() => import('@/components/maps/AirQualityMap'));
const HeatIndexMap = lazy(() => import('@/components/maps/HeatIndexMap'));
const HazardMap = lazy(() => import('@/components/maps/HazardMap'));
const WeatherMap = lazy(() => import('@/components/maps/WeatherMap'));

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
