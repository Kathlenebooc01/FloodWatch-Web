import AreaChart from "@/components/analytics/national-admin/AreaChart"
import RolesChartPie from "@/components/analytics/national-admin/RolesChartPie"
import CitizenStatusPie from "@/components/analytics/national-admin/CitizenStatusPie"
import SystemApiLogs from "@/components/analytics/national-admin/SystemApiLogs"

export default function page() {
  return (
    <section className="grid gap-4 pb-6">
      <AreaChart/>
      <div className="grid lg:grid-cols-2 gap-4">
        <RolesChartPie/>
        <CitizenStatusPie/>
      </div>
      <SystemApiLogs />
    </section>
  )
}
