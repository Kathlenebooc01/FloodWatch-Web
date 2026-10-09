export async function getProvincialReportViewedAt(db) {
  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError) throw authError
  if (!user) return null
  const { data, error } = await db.from('provincial_report_seen')
    .select('viewed_at').eq('admin_id', user.id).maybeSingle()
  if (error) throw error
  return data?.viewed_at ?? null
}

export async function markProvincialReportsSeen(db) {
  const { data, error } = await db.rpc('mark_provincial_reports_seen')
  if (error) throw error
  window.dispatchEvent(new Event('fw_notification_viewed'))
  return data
}
