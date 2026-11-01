import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { authorizeApiRequest } from '@/lib/auth/authorizeApiRequest.mjs'

export async function POST(request) {
  const auth = await authorizeApiRequest(request, ['national_admin'])
  if (auth.response) return auth.response
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY is not configured.' }, { status: 500 })
    }
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { inviteCode } = await request.json()
    if (typeof inviteCode !== 'string' || !/^[0-9a-f-]{36}$/i.test(inviteCode)) {
      return NextResponse.json({ error: 'Invalid invitation code.' }, { status: 400 })
    }
    const { data: invitation, error: invitationError } = await auth.db.from('invitations')
      .select('official_email, lgu_name, account_role, status, expires_at')
      .eq('invite_code', inviteCode).maybeSingle()
    if (invitationError || !invitation || invitation.status !== 'pending' ||
        !invitation.expires_at || Date.parse(invitation.expires_at) <= Date.now()) {
      return NextResponse.json({ error: 'Invitation is unavailable.' }, { status: 400 })
    }
    const email = invitation.official_email
    const lguName = invitation.lgu_name
    const role = invitation.account_role
    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])

    // Build the registration URL with the invite code
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
    const registrationUrl = `${baseUrl}/register/provincial/${inviteCode}`

    const roleMap = { national_admin: 'National Admin', provincial_admin: 'Provincial Admin', lgu_headmaster: 'LGU Headmaster', lgu_frontliner: 'LGU Frontliner', citizen: 'Citizen' };
    const roleName = escapeHtml(roleMap[role] || role);
    const safeLguName = escapeHtml(lguName)

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'FloodWatch <onboarding@floodwatch.site>',
      to: [email],
      subject: `You're Invited to FloodWatch — ${roleName}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8fafc;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #0035A9, #1a56db); padding: 40px 32px; text-align: center; border-radius: 0 0 24px 24px;">
            <h1 style="color: #ffffff; font-size: 28px; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.5px;">FloodWatch</h1>
            <p style="color: #bfe8ff; font-size: 14px; margin: 0; font-weight: 500;">Disaster Risk Reduction Management Platform</p>
          </div>

          <!-- Body -->
          <div style="padding: 40px 32px;">
            <h2 style="color: #1a1a2e; font-size: 22px; font-weight: 700; margin: 0 0 16px 0;">You've been invited!</h2>
            <p style="color: #6b7280; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
              You have been invited to join the <strong style="color: #1a1a2e;">FloodWatch</strong> platform as a contributor. Here are your invitation details:
            </p>

            <!-- Details Card -->
            <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; margin-bottom: 32px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #9ca3af; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Role</td>
                  <td style="padding: 8px 0; color: #1a1a2e; font-size: 15px; font-weight: 600; text-align: right;">${roleName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-top: 1px solid #f3f4f6; color: #9ca3af; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Province / LGU</td>
                  <td style="padding: 8px 0; border-top: 1px solid #f3f4f6; color: #1a1a2e; font-size: 15px; font-weight: 600; text-align: right;">${safeLguName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-top: 1px solid #f3f4f6; color: #9ca3af; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Expires</td>
                  <td style="padding: 8px 0; border-top: 1px solid #f3f4f6; color: #e56c27; font-size: 15px; font-weight: 600; text-align: right;">24 hours</td>
                </tr>
              </table>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center;">
              <a href="${registrationUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #0035A9, #1a56db); color: #ffffff; padding: 16px 48px; border-radius: 12px; text-decoration: none; font-size: 16px; font-weight: 700; letter-spacing: -0.3px; box-shadow: 0 8px 20px -8px rgba(0,53,169,0.5);">
                Accept Invitation
              </a>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 16px;">
                Or <a href="${registrationUrl}" style="color: #0035A9; text-decoration: underline;">click here</a> to accept your invitation.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              This invitation expires in 24 hours. If you did not expect this email, you can safely ignore it.
            </p>
          </div>
        </div>
      `
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Email API error:', err)
    return NextResponse.json({ error: 'Failed to send invitation email' }, { status: 500 })
  }
}
