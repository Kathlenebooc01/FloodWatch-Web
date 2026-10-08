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
    let profileToSave = profileData
    if (profileData.role === 'lgu_headmaster') {
      if (!invitationId) throw new Error('LGU Headmaster invitation is required.')

      const { data: invitation, error: invitationError } = await supabaseAdmin
        .from('invitations')
        .select('id, official_email, account_role, status, municipality_id')
        .eq('id', invitationId)
        .single()
      if (invitationError || !invitation || invitation.status !== 'pending' ||
          invitation.account_role !== 'lgu_headmaster' || !invitation.municipality_id) {
        throw new Error('The LGU Headmaster invitation has no valid municipality assignment.')
      }

      const { data: authAccount, error: authAccountError } = await supabaseAdmin.auth.admin.getUserById(profileData.id)
      if (authAccountError || !authAccount?.user ||
          authAccount.user.email?.toLowerCase() !== invitation.official_email?.toLowerCase() ||
          profileData.email?.toLowerCase() !== invitation.official_email?.toLowerCase()) {
        throw new Error('The invitation does not belong to this account.')
      }

      profileToSave = { ...profileData, municipality_id: invitation.municipality_id }
    }

    // 1. Insert profile into profiles table
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(profileToSave)

    if (profileError) throw profileError

    if (profileData.role === 'lgu_headmaster') {
      const { data: savedProfile, error: readError } = await supabaseAdmin
        .from('profiles')
        .select('municipality_id')
        .eq('id', profileData.id)
        .single()
      if (readError || savedProfile?.municipality_id !== profileToSave.municipality_id) {
        throw new Error('The LGU municipality assignment could not be confirmed.')
      }
    }

    // 1.5 Auto-confirm email so they don't get blocked at login
    await supabaseAdmin.auth.admin.updateUserById(profileData.id, { email_confirm: true })

    // 2. Update invitation status to 'accepted'
    if (invitationId) {
      const { error: inviteError } = await supabaseAdmin
        .from("invitations")
        .update({ status: "accepted" })
        .eq("id", invitationId)

      if (inviteError) {
        console.error("Failed to update invitation status:", inviteError)
        if (profileData.role === 'lgu_headmaster') throw inviteError
      }
    }

    // 3. Send notification to national_admin
    const roleMap = { national_admin: 'National Admin', provincial_admin: 'Provincial Admin', lgu_headmaster: 'LGU Headmaster', lgu_frontliner: 'LGU Frontliner', citizen: 'Citizen' };
    const roleName = roleMap[profileData.role] || profileData.role;
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
