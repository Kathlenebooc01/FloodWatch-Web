import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchPsaCebuStatistics, normalizeAreaName } from '@/lib/psa/cebu-census.mjs'

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

    // Census figures change infrequently. Reuse the verified Supabase cache on ordinary page visits.
    const { data: cached, error: cacheError } = await admin.from('municipality_census_statistics')
      .select('last_synced_at')
    if (cacheError) throw cacheError
    const freshSince = Date.now() - 30 * 24 * 60 * 60 * 1000
    if (cached.length >= 53 && cached.every(row => Date.parse(row.last_synced_at) >= freshSince)) {
      return NextResponse.json({ refreshed: false })
    }

    const { data: provinces, error: provinceError } = await admin.from('province').select('province_id, name')
    if (provinceError) throw provinceError
    const cebu = provinces?.filter(province => normalizeAreaName(province.name) === 'cebu') || []
    if (cebu.length !== 1) throw new Error('Exactly one Cebu province record is required for census matching.')
    const { data: allAreas, error: areaError } = await admin.from('municipality_or_city')
      .select('municipality_id, province_id, name')
    if (areaError) throw areaError
    const independentCebuCities = new Set(['cebu', 'lapulapu', 'mandaue'])
    const areas = (allAreas || []).filter(area => area.province_id === cebu[0].province_id ||
      independentCebuCities.has(normalizeAreaName(area.name)))
    if (!areas?.length) throw new Error('No Cebu municipality or city records are available to match.')

    const result = await fetchPsaCebuStatistics(areas)
    const syncedAt = new Date().toISOString()
    const rows = result.records.map(record => ({ ...record, census_year: 2024, source: 'PSA 2024 Census of Population', last_synced_at: syncedAt }))
    const { error: saveError } = await admin.from('municipality_census_statistics')
      .upsert(rows, { onConflict: 'municipality_id' })
    if (saveError) throw saveError

    return NextResponse.json({ refreshed: true, matched: rows.length, unmatched: result.unmatched, unverified: result.unverified, lastSyncedAt: syncedAt })
  } catch (error) {
    console.error('PSA census sync failed:', error)
    return NextResponse.json({ error: error.message || 'PSA census synchronization failed. Existing statistics were preserved.' }, { status: 503 })
  }
}
