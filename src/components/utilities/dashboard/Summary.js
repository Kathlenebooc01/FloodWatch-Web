import TotalUtilities from "../summary/TotalUtilities"
import PendingRequest from "../summary/PendingRequest"
import LowUtilties from "../summary/LowUtilties"
export default function Summary() {
  return (
    <section>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1">
            <TotalUtilities/>
            <PendingRequest/>
            <LowUtilties/>
        </div>
    </section>
  )
}
