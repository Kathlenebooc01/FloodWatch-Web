import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const serviceDb = process.env.NEXT_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  : null;

async function decideWithoutMigration(userId, verificationId, decision) {
  const { data: admin, error: adminError } = await serviceDb.from('profiles')
    .select('role').eq('id', userId).single();
  if (adminError || admin?.role !== 'national_admin') {
    return { error: 'National Admin access required', status: 403 };
  }

  const { data: submission, error: readError } = await serviceDb.from('id_verification')
    .select('id_verification_id, user_id, status').eq('id_verification_id', verificationId).single();
  if (readError || !submission) return { error: 'Verification request not found', status: 404 };
  if (submission.status?.toLowerCase() !== 'pending') {
    return { error: 'Verification request has already been reviewed', status: 409 };
  }

  const { data: citizen, error: citizenError } = await serviceDb.from('profiles')
    .select('id, is_verified').eq('id', submission.user_id).single();
  if (citizenError || !citizen) return { error: 'Citizen profile not found', status: 404 };

  const { error: profileError } = await serviceDb.from('profiles')
    .update({ is_verified: decision === 'approved' }).eq('id', citizen.id);
  if (profileError) return { error: profileError.message, status: 500 };

  const { data: verification, error: updateError } = await serviceDb.from('id_verification')
    .update({ status: decision, reviewed_by: userId })
    .eq('id_verification_id', verificationId)
    .select().maybeSingle();
  if (updateError || !verification) {
    await serviceDb.from('profiles').update({ is_verified: citizen.is_verified }).eq('id', citizen.id);
    return { error: updateError?.message || 'Unable to save verification request', status: 500 };
  }
  return { verification };
}

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { id_verification_id, decision } = await request.json();
    if (!id_verification_id || !['approved', 'rejected'].includes(decision)) {
      return NextResponse.json({ error: 'Invalid verification decision' }, { status: 400 });
    }

    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await db.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const { data, error } = await db.rpc('decide_id_verification', {
      verification_id: id_verification_id,
      decision,
    });
    if (error?.code === 'PGRST202' && process.env.NEXT_SERVICE_ROLE_KEY) {
      const fallback = await decideWithoutMigration(user.id, id_verification_id, decision);
      if (fallback.error) return NextResponse.json({ error: fallback.error }, { status: fallback.status });
      return NextResponse.json({ verification: fallback.verification }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ verification: data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Unable to save verification decision' }, { status: 500 });
  }
}
