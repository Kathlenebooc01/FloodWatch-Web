import LGUSummary from "@/components/monitoring/LGUSummary"
import ScheduleSummary from "@/components/schedule/ScheduleSummary"
import UtilitiesAreaChartTracker from "@/components/utilities/charts/UtilitiesAreaChartTracker"
import PendingListSummary from "@/components/utilities/summary/PendingListSummary"
import LowStockListSummary from "@/components/utilities/summary/LowStockListSummary"
export default function page() {
  return (
    <section className="grid gap-5">
      <LGUSummary/>
      <ScheduleSummary/>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <PendingListSummary/>
        <LowStockListSummary/>
      </div>
      <UtilitiesAreaChartTracker/>
    </section>
  )
}
