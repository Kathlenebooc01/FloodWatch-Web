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

    // 0. Delete related records in child tables that reference this user_id
    await supabase.from('incident_report').delete().eq('user_id', userId);
    await supabase.from('notifications').delete().eq('user_id', userId);
    await supabase.from('id_verification').delete().eq('user_id', userId);

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
      // If the user is already deleted in auth.users, treat as success
      if (authError.message === 'User not found') {
        console.warn("Auth user already deleted or not found, ignoring error.");
      } else {
        console.error("Error deleting auth user:", authError)
        throw authError
      }
    }

    return NextResponse.json({ success: true, message: 'Account permanently deleted' })
  } catch (err) {
    console.error("API delete-account error:", err)
    return NextResponse.json(
      { success: false, error: err.message || JSON.stringify(err) || 'Failed to delete account.' },
      { status: 500 }
    )
  }
}
