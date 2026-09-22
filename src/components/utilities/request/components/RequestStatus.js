import CardBasedText from "@/components/cards/CardBasedText"

export default function RequestStatus({ status }) {
  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'summary-data-icon-amber'
      case 'partially_allocated': return 'summary-data-icon-blue'
      case 'fully_allocated': return 'summary-data-icon-green'
      case 'rejected': return 'summary-data-icon-red'
      default: return 'summary-data-icon-amber'
    }
  }

  return (
    <CardBasedText className={`${getStatusClass(status)} font-semibold capitalize`}>
      {status || 'Pending'}
    </CardBasedText>
  )
}
