"use server"

import { createClient } from "@supabase/supabase-js"

export async function createProfileAfterSignUp(profileData, invitationId, agreement) {
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

  let createdUserId = null
  try {
    const allowedRoles = ['provincial_admin', 'national_admin', 'lgu_headmaster']
    if (!invitationId || !allowedRoles.includes(profileData.role)) throw new Error('A valid invitation is required.')
    if (!agreement?.agreed || typeof agreement.password !== 'string' ||
        agreement.password.length < 8 || !/[A-Z]/.test(agreement.password) ||
        !/[a-z]/.test(agreement.password) || !/[0-9]/.test(agreement.password) ||
        !/[^A-Za-z0-9]/.test(agreement.password)) {
      throw new Error('Password requirements and policy agreement are required.')
    }
    const firstName = profileData.first_name?.trim()
    const lastName = profileData.last_name?.trim()
    if (!firstName || !lastName || !profileData.mobile_number?.trim()) {
      throw new Error('First name, last name, and phone number are required.')
    }
    const { data: invitation, error: invitationError } = await supabaseAdmin
        .from('invitations')
        .select('id, official_email, account_role, status, municipality_id, lgu_name, expires_at')
        .eq('id', invitationId)
        .single()
    if (invitationError || !invitation || invitation.status !== 'pending' ||
        new Date(invitation.expires_at) <= new Date() || invitation.account_role !== profileData.role ||
        (profileData.role === 'lgu_headmaster' && !invitation.municipality_id)) {
      throw new Error('The invitation is invalid or expired.')
    }

      if (profileData.email?.toLowerCase() !== invitation.official_email?.toLowerCase()) {
        throw new Error('The invitation does not belong to this account.')
      }

    let assignedProvinceId = null
    if (invitation.account_role === 'provincial_admin') {
      const { data: provinces, error: provinceError } = await supabaseAdmin
        .from('province').select('province_id, name')
      if (provinceError) throw provinceError
      const matches = (provinces || []).filter(province =>
        province.name?.trim().toLowerCase() === invitation.lgu_name?.trim().toLowerCase())
      if (matches.length !== 1) throw new Error('The invited province could not be verified.')
      assignedProvinceId = matches[0].province_id
    } else if (invitation.account_role === 'lgu_headmaster') {
      const { data: municipality, error: municipalityError } = await supabaseAdmin
        .from('municipality_or_city').select('province_id')
        .eq('municipality_id', invitation.municipality_id).single()
      if (municipalityError || !municipality?.province_id) {
        throw new Error('The invited municipality could not be verified.')
      }
      assignedProvinceId = municipality.province_id
    }

    const { data: createdAccount, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: invitation.official_email,
      password: agreement.password,
      email_confirm: true,
    })
    if (createError || !createdAccount?.user?.id) throw createError || new Error('Account creation failed.')
    createdUserId = createdAccount.user.id
    const profileToSave = {
      id: createdUserId,
      email: invitation.official_email,
      role: invitation.account_role,
      first_name: firstName,
      middle_name: profileData.middle_name?.trim() || null,
      last_name: lastName,
      full_name: [firstName, profileData.middle_name?.trim(), lastName].filter(Boolean).join(' '),
      mobile_number: profileData.mobile_number.trim(),
      mobile_number_secondary: profileData.mobile_number_secondary || null,
      organization_name: profileData.organization_name || null,
      is_verified: false,
      terms_accepted_at: new Date().toISOString(),
      terms_version: '1.0',
      privacy_accepted_at: new Date().toISOString(),
      privacy_version: '1.0',
      ...(assignedProvinceId ? { province_id: assignedProvinceId } : {}),
      ...(profileData.role === 'lgu_headmaster' ? { municipality_id: invitation.municipality_id } : {}),
    }

    // 1. Insert profile into profiles table
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert(profileToSave)

    if (profileError) throw profileError

    if (profileData.role === 'lgu_headmaster') {
      const { data: savedProfile, error: readError } = await supabaseAdmin
        .from('profiles')
        .select('municipality_id')
        .eq('id', createdUserId)
        .single()
      if (readError || savedProfile?.municipality_id !== profileToSave.municipality_id) {
        throw new Error('The LGU municipality assignment could not be confirmed.')
      }
    }

    // 2. Update invitation status to 'accepted'
    if (invitationId) {
      const { data: acceptedInvitation, error: inviteError } = await supabaseAdmin
        .from("invitations")
        .update({ status: "accepted" })
        .eq("id", invitationId)
        .eq('status', 'pending')
        .select('id')
        .single()

      if (inviteError || !acceptedInvitation) {
        console.error("Failed to update invitation status:", inviteError)
        throw inviteError || new Error('Invitation was already used.')
      }
    }

    // 3. Send notification to national_admin
    const roleMap = { national_admin: 'National Admin', provincial_admin: 'Provincial Admin', lgu_headmaster: 'LGU Headmaster', lgu_frontliner: 'LGU Frontliner', citizen: 'Citizen' };
    const roleName = roleMap[profileData.role] || profileData.role;
    const { error: notifError } = await supabaseAdmin.from('notifications').insert([{
      user_id: createdUserId,
      title: 'New User Registered',
      message: `${profileToSave.full_name} (${profileToSave.email}) has registered for the role of ${roleName}.`,
      type: 'Registration',
      target_role: 'national_admin',
      is_read: false
    }])
    
    if (notifError) console.error("Registration notification error:", notifError)

    return { success: true }
  } catch (error) {
    if (createdUserId) await supabaseAdmin.auth.admin.deleteUser(createdUserId)
    console.error("Server Action Error:", error)
    return { success: false, error: error.message }
  }
}
