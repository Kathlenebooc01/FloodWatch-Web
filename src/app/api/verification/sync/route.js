import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.NEXT_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function GET() {
  return handleSync();
}

export async function POST() {
  return handleSync();
}

async function handleSync() {
  try {
    const { data: verifs, error: vErr } = await supabaseAdmin
      .from('id_verification')
      .select('id_verification_id, user_id, status, ai_is_valid, ai_confidence_score');

    if (vErr || !verifs) {
      return NextResponse.json({ error: vErr?.message || 'Failed to fetch verifications' }, { status: 500 });
    }

    const { data: profs } = await supabaseAdmin
      .from('profiles')
      .select('id, is_verified');

    const profMap = new Map((profs || []).map(p => [p.id, p.is_verified]));
    const updatedIds = [];

    for (const row of verifs) {
      const isProfVerified = profMap.get(row.user_id) === true;
      const isAiApproved = row.ai_is_valid && Number(row.ai_confidence_score) >= 80;

      if ((row.status || '').toLowerCase() === 'pending' && (isProfVerified || isAiApproved)) {
        await supabaseAdmin
          .from('id_verification')
          .update({ status: 'approved' })
          .eq('id_verification_id', row.id_verification_id);
        
        updatedIds.push(row.id_verification_id);
      }
    }

    return NextResponse.json({
      success: true,
      synced: updatedIds.length,
      updatedIds,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
