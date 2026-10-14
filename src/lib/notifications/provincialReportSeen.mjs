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
  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError) throw authError
  if (!user) return null
  const { data: profile, error: profileError } = await db.from('profiles')
    .select('role').eq('id', user.id).maybeSingle()
  if (profileError) throw profileError
  // The RPC is restricted to provincial admins; national admins may still
  // visit this page without having a provincial report-seen record.
  if (profile?.role !== 'provincial_admin') return null
  const { data, error } = await db.rpc('mark_provincial_reports_seen')
  if (error) throw error
  window.dispatchEvent(new Event('fw_notification_viewed'))
  return data
}
