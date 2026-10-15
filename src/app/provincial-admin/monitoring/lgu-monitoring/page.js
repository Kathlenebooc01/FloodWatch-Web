import LGUSummary from "@/components/monitoring/LGUSummary"
import LGUTable from "@/components/monitoring/LGUTable"
import { Suspense } from "react"
export default function page() {
  return (
    <section className="grid gap-5">
      <LGUSummary />
      <Suspense fallback={null}><LGUTable /></Suspense>
    </section>
  )
}
