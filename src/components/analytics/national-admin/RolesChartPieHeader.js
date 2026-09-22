import { ChartPie } from "lucide-react"
import CardSubHeader from "@/components/cards/CardSubHeader"
import CardBasedText from "@/components/cards/CardBasedText"
export default function RolesChartPieHeader() {
  return (
    <section>
        <div className="flex items-center gap-2">
        <span className="summary-data-icon">
        <ChartPie className="size-5"/>
        </span>
        <CardSubHeader>Role Distribution</CardSubHeader>
        </div>
    </section>
  )
}
