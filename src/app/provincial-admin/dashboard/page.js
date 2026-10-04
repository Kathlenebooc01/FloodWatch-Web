import LGUSummary from "@/components/monitoring/LGUSummary"
import ScheduleSummary from "@/components/schedule/ScheduleSummary"
import UtilitiesAreaChartTracker from "@/components/utilities/charts/UtilitiesAreaChartTracker"
import LowStockListSummary from "@/components/utilities/summary/LowStockListSummary"
import LGUEmergencyRequestCards from "@/components/utilities/summary/LGUEmergencyRequestCards"
export default function page() {
  return (
    <section className="grid gap-5">
      <LGUSummary/>
      <ScheduleSummary/>
      {/* ── High Urgency Emergency Requests ── */}
      <div className="bg-white border border-red-100 rounded-2xl p-5 shadow-sm">
        <LGUEmergencyRequestCards />
      </div>
      <LowStockListSummary/>
      <UtilitiesAreaChartTracker/>
    </section>
  )
}
