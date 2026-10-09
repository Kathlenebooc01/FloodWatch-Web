export function newestReportTimestamp(reports) {
  return reports.reduce((latest, report) => report.created_at && (!latest || report.created_at > latest)
    ? report.created_at : latest, null)
}

export function hasNewReports(reports, seenAt) {
  return reports.some(report => report.created_at && (!seenAt || report.created_at > seenAt))
}
