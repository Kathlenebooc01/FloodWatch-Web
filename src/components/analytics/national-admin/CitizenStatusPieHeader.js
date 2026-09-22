
import PrimaryButton from "@/components/button/PrimaryButton"
import CardSubHeader from "@/components/cards/CardSubHeader"
import { ChartPie } from "lucide-react"
import Link from "next/link"

export default function CitizenStatusPieHeader({ hasPending }) {
  return (
    <section className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            <span className="summary-data-icon">
            <ChartPie className="size-5"/>
            </span>
            <CardSubHeader>Identification Status</CardSubHeader>
        </div>
        <Link href={hasPending ? "/national-admin/id_verification" : "#"}>
          <PrimaryButton 
            className="text-xs py-2 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!hasPending}
          >
            View Request
          </PrimaryButton>
        </Link>
    </section>
  )
}
