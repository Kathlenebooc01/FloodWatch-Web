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
    <main className="grid gap-4 w-full">

      <HazardMap />
    </main>
  );
}
