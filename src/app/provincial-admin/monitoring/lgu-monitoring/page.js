import LGUSummary from "@/components/monitoring/LGUSummary"
import LGUTable from "@/components/monitoring/LGUTable"
export default function page() {
  return (
    <section className="grid gap-5">
      <LGUSummary />
      <LGUTable />
    </section>
  )
}
