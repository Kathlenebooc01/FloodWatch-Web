import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const body = await req.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId.' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 1. Delete from public.profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error("Error deleting from profiles:", profileError)
      throw profileError
    }

    // 2. Delete from auth.users (Requires Service Role Key)
    const { error: authError } = await supabase.auth.admin.deleteUser(userId)

    if (authError) {
      console.error("Error deleting auth user:", authError)
      throw authError
    }

    return NextResponse.json({ success: true, message: 'Account permanently deleted' })
  } catch (err) {
    console.error("API delete-account error:", err)
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to delete account.' },
      { status: 500 }
    )
  }
}
