import { Suspense } from "react"
import SummaryData from "@/components/contributors/SummaryData"
import SummaryDataSkeleton from "@/components/contributors/SummaryDataSkeleton"
import ContributorTabWrapper from "@/components/contributors/ContributorTabWrapper"

export default function ContributorPage() {
  return (
    <main className="grid gap-5">
      <Suspense fallback={<SummaryDataSkeleton />}>
        <SummaryData />
      </Suspense>
      <ContributorTabWrapper />
    </main>
  )
}