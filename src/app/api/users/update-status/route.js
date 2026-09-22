import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const body = await req.json()
    const { userId, status } = body

    if (!userId || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing userId or status.' },
        { status: 400 }
      )
    }

    // Normalize status strictly to 'active' or 'deactivate' per database check constraint
    const normalizedStatus = status.toLowerCase().includes('deact') ? 'deactivate' : 'active'

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_SERVICE_ROLE_KEY
    )

    const { data, error } = await supabase
      .from('profiles')
      .update({ account_status: normalizedStatus })
      .eq('id', userId)
      .select()

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, message: `Account status updated to ${normalizedStatus}`, data })
  } catch (err) {
    console.error("API update-status error:", err)
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update account status.' },
      { status: 500 }
    )
  }
}
