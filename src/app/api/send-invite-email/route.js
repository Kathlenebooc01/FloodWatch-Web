import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request) {
  try {
    const { email, lguName, role, inviteCode } = await request.json()

    // Build the registration URL with the invite code
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const registrationUrl = `${baseUrl}/register/provincial/${inviteCode}`

    // For testing phase: Log the invite link so it can be copied directly from the terminal
    console.log('\\n=========================================================')
    console.log(`📨 INVITE LINK FOR ${email}:`)
    console.log(registrationUrl)
    console.log('=========================================================\\n')

    const roleName = role === 'lgu_headmaster' ? 'LGU Headmaster' : 'Provincial Admin'

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
                  <td style="padding: 8px 0; border-top: 1px solid #f3f4f6; color: #1a1a2e; font-size: 15px; font-weight: 600; text-align: right;">${lguName}</td>
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
                Or copy and paste this link into your browser:<br/>
                <a href="${registrationUrl}" style="color: #0035A9; word-break: break-all;">${registrationUrl}</a>
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
