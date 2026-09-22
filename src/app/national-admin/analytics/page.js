
import AreaChart from "@/components/analytics/national-admin/AreaChart"
import RolesChartPie from "@/components/analytics/national-admin/RolesChartPie"
import CitizenStatusPie from "@/components/analytics/national-admin/CitizenStatusPie"
export default function page() {
  return (
    <section className="grid gap-3">
     <AreaChart/>
     <div className="grid lg:grid-cols-2 gap-2">
     <RolesChartPie/>
     <CitizenStatusPie/>
     </div>
    </section>
  )
}
