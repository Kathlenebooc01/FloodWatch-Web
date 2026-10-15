import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const token = req.headers.get('authorization')?.replace(/^Bearer /i, '')
    const email = (await req.json()).email?.trim()
    if (!token || !email) return NextResponse.json({ error: 'Unauthorized or missing email.' }, { status: 400 })

    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_SERVICE_ROLE_KEY)
    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    const { data: actor, error: actorError } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (actorError || actor?.role !== 'national_admin') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

    const { data: profiles, error: profileError } = await admin
      .from('profiles').select('id').eq('email', email)
    if (profileError) throw profileError
    for (const profile of profiles || []) {
      const { data: account, error } = await admin.auth.admin.getUserById(profile.id)
      if (error && error.message !== 'User not found') throw error
      if (account?.user) return NextResponse.json({ removed: false })
    }

    const { error: deleteError } = await admin.from('invitations')
      .delete().eq('official_email', email).eq('status', 'accepted')
    if (deleteError) throw deleteError
    return NextResponse.json({ removed: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
