import CardBasedText from "@/components/cards/CardBasedText"
import { normalizeRequestStatus, requestStatusLabel } from "@/lib/domain-values.mjs"

export default function RequestStatus({ status }) {
  const getStatusClass = (status) => {
    switch (normalizeRequestStatus(status)?.toLowerCase()) {
      case 'pending': return 'summary-data-icon-amber'
      case 'pending_dispatch': return 'summary-data-icon-amber'
      case 'partially_allocated': return 'summary-data-icon-blue'
      case 'fully_allocated': return 'summary-data-icon-blue'
      case 'in_transit': return 'summary-data-icon-blue'
      case 'received': return 'summary-data-icon-blue'
      case 'returning': return 'summary-data-icon-blue'
      case 'returned': return 'summary-data-icon-green'
      case 'rejected': return 'summary-data-icon-red'
      default: return 'summary-data-icon-amber'
    }
  }

  return (
    <CardBasedText className={`${getStatusClass(status)} font-semibold capitalize`}>
      {requestStatusLabel(status)}
    </CardBasedText>
  )
}
