import MonitoringNavbar from "@/components/monitoring/MonitoringNavbar"
export default function MonitoringLayout({ children }) {
  return (
    <main className="grid gap-5">
        <MonitoringNavbar/>
      <section>
        {children}
      </section>
    </main>
  )
}
