import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { normalizeRole } from '../domain-values.mjs';

const deny = (message, status) => NextResponse.json({ error: message }, { status });

export async function authorizeApiRequest(request, allowedRoles) {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) return { response: deny('Authentication required', 401) };
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_SERVICE_ROLE_KEY) {
    return { response: deny('Authentication is unavailable', 503) };
  }

  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error } = await db.auth.getUser(token);
    if (error || !user) return { response: deny('Invalid session', 401) };

    const { data: profile, error: profileError } = await db.from('profiles')
      .select('role, province_id, municipality_id, account_status').eq('id', user.id).single();
    if (profileError || !profile) return { response: deny('Access denied', 403) };
    const role = normalizeRole(profile.role);
    if (!role || !allowedRoles.includes(role) || profile.account_status?.toLowerCase().includes('deact')) {
      return { response: deny('Access denied', 403) };
    }
    return { db, user, token, profile: { ...profile, role } };
  } catch {
    return { response: deny('Authentication is unavailable', 503) };
  }
}
