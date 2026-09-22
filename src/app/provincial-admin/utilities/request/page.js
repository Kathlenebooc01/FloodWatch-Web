import TotalCompletedRequest from "@/components/utilities/summary/TotalCompletedRequest";
import TotalRequest from "@/components/utilities/summary/TotalRequest";
import PendingRequest from "@/components/utilities/summary/PendingRequest";
import RequestTable from "@/components/utilities/tables/RequestTable";
export default function page() {
  return (
    <section className="grid gap-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <TotalRequest/>
        <PendingRequest/>
        <TotalCompletedRequest/>
      </div>
      <div className="w-full min-w-0 overflow-hidden">
        <RequestTable/>
      </div>
    </section>
  )
}
