"use server"

import { createClient } from "@supabase/supabase-js"

export async function createProfileAfterSignUp(profileData, invitationId) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  try {
    // 1. Insert profile into profiles table
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(profileData)

    if (profileError) throw profileError

    // 2. Update invitation status to 'accepted'
    if (invitationId) {
      const { error: inviteError } = await supabaseAdmin
        .from("invitations")
        .update({ status: "accepted" })
        .eq("id", invitationId)

      if (inviteError) {
        console.error("Failed to update invitation status:", inviteError)
      }
    }

    // 3. Send notification to national_admin
    const roleName = profileData.role === "lgu_headmaster" ? "LGU Headmaster" : "Provincial Admin"
    const { error: notifError } = await supabaseAdmin.from('notifications').insert([{
      user_id: profileData.id,
      title: 'New User Registered',
      message: `${profileData.full_name} (${profileData.email}) has registered for the role of ${roleName}.`,
      type: 'Registration',
      target_role: 'national_admin',
      is_read: false
    }])
    
    if (notifError) console.error("Registration notification error:", notifError)

    return { success: true }
  } catch (error) {
    console.error("Server Action Error:", error)
    return { success: false, error: error.message }
  }
}
