import React from 'react';
import HazardMap from '@/components/maps/HazardMap';
import CardHeader from '@/components/cards/CardHeader';
import CardSubHeader from '@/components/cards/CardSubHeader';

export default function HazardMapPage() {
  return (
    <main className="grid gap-4 w-full">

      <HazardMap />
    </main>
  );
}
