import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { isAcceptedReport } from '@/lib/situational-report-hierarchy.mjs';

async function authenticate(req) {
  const authorization = req.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return { error: 'Authentication required', status: 401 };
  // Use the caller's JWT so existing database RLS remains authoritative.
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error } = await db.auth.getUser(authorization.slice(7));
  if (error || !user) return { error: 'Invalid session', status: 401 };
  const profile = await db.from('profiles').select('id, role, municipality_id, province_id').eq('id', user.id).single();
  if (profile.error || !['lgu_headmaster', 'lgu_frontliner'].includes(profile.data?.role) || !profile.data?.municipality_id) {
    return { error: 'An LGU account with a municipality is required', status: 403 };
  }
  return { db, profile: profile.data };
}

const isSituational = report => {
  const text = `${report.hazard_type || ''} ${report.description || ''}`.toLowerCase();
  return !text.includes('escalat') && (text.includes('situational') || text.includes('field status'));
};
const failure = (error, status = 400) => NextResponse.json({ error }, { status });

// Source for the LGU "Link to Existing Report" selector: accepted roots only.
export async function GET(req) {
  try {
    const auth = await authenticate(req);
    if (auth.error) return failure(auth.error, auth.status);
    const reports = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await auth.db.from('incident_report').select('*')
        .eq('municipality_id', auth.profile.municipality_id)
        .is('parent_report_id', null).ilike('status', 'Verified')
        .order('created_at', { ascending: false }).order('report_id', { ascending: false })
        .range(offset, offset + 499);
      if (error) return failure(error.message);
      reports.push(...data.filter(isSituational));
      if (data.length < 500) break;
    }
    return NextResponse.json({ reports }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return failure('Unable to load linkable reports', 500);
  }
}

export async function POST(req) {
  try {
    const auth = await authenticate(req);
    if (auth.error) return failure(auth.error, auth.status);
    const body = await req.json();
    if (!body.parent_report_id || !body.description?.trim() || typeof body.image_url !== 'string') {
      return failure('parent_report_id, description and image_url are required');
    }
    let rootId = body.parent_report_id;
    const visited = new Set();
    let root;
    while (rootId) {
      if (visited.has(rootId)) return failure('Invalid report relationship');
      visited.add(rootId);
      const { data, error } = await auth.db.from('incident_report').select('*').eq('report_id', rootId).single();
      if (error || !data) return failure('Main report not found', 404);
      if (data.municipality_id !== auth.profile.municipality_id) return failure('Report belongs to another municipality', 403);
      root = data;
      rootId = data.parent_report_id;
    }
    if (!isSituational(root) || !isAcceptedReport(root)) {
      return failure('Main report must be verified by PDRRMO/Admin before linking an update', 409);
    }
    const { data, error } = await auth.db.from('incident_report').insert({
      parent_report_id: root.report_id,
      user_id: auth.profile.id,
      municipality_id: root.municipality_id,
      province_id: root.province_id,
      barangay_id: root.barangay_id,
      hazard_type: root.hazard_type,
      description: body.description.trim(),
      image_url: body.image_url,
      status: 'pending',
    }).select().single();
    // The database trigger checks acceptance again atomically at insertion.
    if (error) return failure(error.message, error.code === '23514' ? 409 : 400);
    return NextResponse.json({ report: data }, { status: 201 });
  } catch {
    return failure('Unable to submit report update', 400);
  }
}
