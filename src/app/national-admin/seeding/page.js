import { Suspense } from 'react'
import SeedTable from "@/components/table/national-admin/SeedTable"
import SeedCard from "@/components/Seeding/SeedCard"
import SquareSkeleton from '@/components/skeleton/SquareSkeleton'
import ImportAreas from "@/components/Seeding/ImportAreas"
import AddAreaModal from "@/components/Seeding/AddAreaModal"
import { createClient } from '@supabase/supabase-js'
import GeneralCard from '@/components/cards/GeneralCard'
export default async function page(props) {
  const searchParams = await props.searchParams;
  const showAddArea = searchParams?.['add-area'] === 'true';

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_SERVICE_ROLE_KEY
  );

  const { data: rawData, error: fetchErr } = await supabase
    .from('province')
    .select('province_id, name, municipality_or_city(municipality_id, name, center_latitude, center_longitude, center_point, boundary_geofence, added_on, updated_at)')
    .order('name', { ascending: true });

  if (fetchErr) {
    console.error("Error fetching seeding rawData:", fetchErr);
  }

  const tableData = [];
  if (rawData) {
    rawData.forEach((prov) => {
      if (prov.municipality_or_city && prov.municipality_or_city.length > 0) {
        prov.municipality_or_city.forEach((m, idx) => {
          tableData.push({
            id: `${prov.province_id}-${idx}`, // Unique ID for each row
            municipality_id: m.municipality_id,
            province_id: prov.province_id,
            province: prov.name,
            municipality: m.name,
            latitude: m.center_latitude ?? 8.9475,
            longitude: m.center_longitude ?? 125.5406,
            center_point: m.center_point ?? null,
            boundary_geofence: m.boundary_geofence ?? null,
            added_on: m.added_on ? new Date(m.added_on).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : "N/A",
            updated_at: m.updated_at ? new Date(m.updated_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : "N/A"
          });
        });
      } else {
        // If a province has no municipalities yet, show it anyway
        tableData.push({
          id: prov.province_id,
          province: prov.name,
          municipality: "No municipalities added",
          latitude: 8.9475,
          longitude: 125.5406,
          center_point: null,
          boundary_geofence: null,
          added_on: "N/A",
          updated_at: "N/A"
        });
      }
    });

    // Ensure all municipality entries are strictly sorted in alphabetical order (A to Z)
    tableData.sort((a, b) => a.municipality.localeCompare(b.municipality));
  }

  return (
    <section className="grid gap-5">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4">
        <Suspense fallback={<SquareSkeleton />}>
          <SeedCard />
        </Suspense>
        <ImportAreas/>
      </div>
      <SeedTable data={tableData.length > 0 ? tableData : undefined} />
      {showAddArea && (
        <Suspense fallback={null}>
          <AddAreaModal />
        </Suspense>
      )}
    </section>
  )
}