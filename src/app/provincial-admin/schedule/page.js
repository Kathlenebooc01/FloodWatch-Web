import MainCalendar from "@/components/schedule/MainCalendar"
import ScheduleSummary from "@/components/schedule/ScheduleSummary"

export default function page() {
  return (
    <section className="grid gap-5">
      <ScheduleSummary />
      <MainCalendar />
    </section>
  )
}
