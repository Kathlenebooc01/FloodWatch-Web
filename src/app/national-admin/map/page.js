"use client";

import { useState, Suspense } from "react";
import dynamic from 'next/dynamic';
import MapsDocumentation from "@/components/maps/MapsDocumentation";
import MapSkeleton from "@/components/skeleton/MapSkeleton";

const Map = dynamic(() => import("@/components/maps/Map"), { ssr: false });
const WeatherMap = dynamic(() => import("@/components/maps/WeatherMap"), { ssr: false });

export default function Page() {
  const [activeTab, setActiveTab] = useState('Risk Mapping');

  return (
    <section className="grid relative gap-3 mt-2">
      <div className="flex justify-end z-10">
        <MapsDocumentation />
      </div>

      <Suspense fallback={<MapSkeleton />}>
        {activeTab === 'Risk Mapping' ? (
          <Map activeTab={activeTab} onTabChange={setActiveTab} />
        ) : (
          <WeatherMap activeTab={activeTab} onTabChange={setActiveTab} />
        )}
      </Suspense>
    </section>
  );
}
