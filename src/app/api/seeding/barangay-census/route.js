import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchBarangayCensus } from '@/lib/psa/barangay-census.mjs'

export const maxDuration = 60

export async function POST(request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  try {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    const { data: profile, error: profileError } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (profileError || profile?.role !== 'national_admin') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

    const { codes } = await request.json()
    if (!Array.isArray(codes)) return NextResponse.json({ error: 'Barangay codes are required.' }, { status: 400 })
    const statistics = await fetchBarangayCensus(codes)
    return NextResponse.json({ statistics, censusYear: 2024 })
  } catch (error) {
    console.error('PSA barangay census lookup failed:', error)
    return NextResponse.json({ error: error.message || 'Barangay census data is unavailable.' }, { status: 503 })
  }
}
