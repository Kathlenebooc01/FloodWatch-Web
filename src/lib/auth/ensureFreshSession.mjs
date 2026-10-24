let refreshInFlight = null;

export function isAuthSessionMissing(error) {
  return error?.name === 'AuthSessionMissingError' || error?.code === 'session_not_found';
}

// Share one refresh among the provincial counters and monitoring table.
export async function ensureFreshSession(db) {
  const { data, error } = await db.auth.getSession();
  if (error || !data?.session) return false;
  const expiresAt = data.session.expires_at;
  if (!expiresAt || expiresAt * 1000 > Date.now() + 60_000) return true;

  if (!refreshInFlight) {
    refreshInFlight = db.auth.refreshSession().then(async ({ data: refreshed, error: refreshError }) => {
      if (refreshError || !refreshed?.session) {
        await db.auth.signOut({ scope: 'local' });
        return false;
      }
      return true;
    }).catch(() => false).finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}
