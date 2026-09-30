
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
        {hasPending && (
          <Link href="/national-admin/id_verification">
            <PrimaryButton className="text-xs py-2 px-3">
              View Request
            </PrimaryButton>
          </Link>
        )}
    </section>
  )
}
