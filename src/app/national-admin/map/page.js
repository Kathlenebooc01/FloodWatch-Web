"use client";

import { useState, Suspense, lazy } from "react";
import MapsDocumentation from "@/components/maps/MapsDocumentation";
import MapSkeleton from "@/components/skeleton/MapSkeleton";

const Map = lazy(() => import("@/components/maps/Map"));
const WeatherMap = lazy(() => import("@/components/maps/WeatherMap"));

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
