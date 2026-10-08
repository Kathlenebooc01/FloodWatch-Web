const LGU_ROLES = ['lgu_headmaster', 'lgu_frontliner']

export async function fetchProvincialMonitoringUnreadCounts(db, reportViewedAt, lguViewedAt) {
  let citizenReports = db
    .from('incident_report')
    .select('report_id, profiles!user_id!inner(role)', { count: 'exact', head: true })
    .eq('profiles.role', 'citizen')

  let lguReports = db
    .from('incident_report')
    .select('report_id, profiles!user_id!inner(role)', { count: 'exact', head: true })
    .in('profiles.role', LGU_ROLES)

  let lguDistress = db
    .from('distress_signals')
    .select('distress_id, profiles:profile_id!inner(role)', { count: 'exact', head: true })
    .in('profiles.role', LGU_ROLES)

  if (reportViewedAt) citizenReports = citizenReports.gt('created_at', reportViewedAt)
  if (lguViewedAt) {
    lguReports = lguReports.gt('created_at', lguViewedAt)
    lguDistress = lguDistress.gt('created_at', lguViewedAt)
  }

  const results = await Promise.all([citizenReports, lguReports, lguDistress])
  const failed = results.find(({ error }) => error)
  if (failed) throw failed.error

  return {
    reportCount: results[0].count ?? 0,
    lguCount: (results[1].count ?? 0) + (results[2].count ?? 0),
  }
}
