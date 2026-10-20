const PAGE_KEYS = ['lgu', 'request', 'notification', 'distress'];

export async function getProvincialPageViewedAt(db, pageKey) {
  if (!PAGE_KEYS.includes(pageKey)) throw new Error('Invalid page key');
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError) throw authError;
  if (!user) return null;
  const { data, error } = await db.from('provincial_page_seen')
    .select('viewed_at').eq('admin_id', user.id).eq('page_key', pageKey).maybeSingle();
  if (error) throw error;
  return data?.viewed_at ?? null;
}

export async function markProvincialPageSeen(db, pageKey) {
  if (!PAGE_KEYS.includes(pageKey)) throw new Error('Invalid page key');
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError) throw authError;
  if (!user) return null;
  const { data: profile, error: profileError } = await db.from('profiles')
    .select('role').eq('id', user.id).maybeSingle();
  if (profileError) throw profileError;
  if (profile?.role !== 'provincial_admin') return null;
  const { data, error } = await db.rpc('mark_provincial_page_seen', { p_page_key: pageKey });
  if (error) throw error;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('fw_notification_viewed'));
  return data;
}
