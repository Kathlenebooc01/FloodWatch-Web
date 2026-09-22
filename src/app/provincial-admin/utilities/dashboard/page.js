import Summary from "@/components/utilities/dashboard/Summary"
import UtilitiesAreaChartTracker from "@/components/utilities/charts/UtilitiesAreaChartTracker"
import PendingListSummary from "@/components/utilities/summary/PendingListSummary"
import LowStockListSummary from "@/components/utilities/summary/LowStockListSummary"
export default function page() {
  return (
    <section className="grid gap-5">
      <Summary/>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        <div className="lg:col-span-2">
          <UtilitiesAreaChartTracker/>
        </div>
        <div className="grid lg:col-span-1">
          <PendingListSummary/>
          <LowStockListSummary/>
        </div>
      </div>
    </section>
  )
}
