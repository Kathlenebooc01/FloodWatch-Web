import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import RegisterationCard from "@/components/registration/RegisterationCard"

// Use service role to bypass RLS for invite validation
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_SERVICE_ROLE_KEY
)

export default async function InviteRegistrationPage({ params }) {
  const { id } = await params

  // Look up the invitation by invite_code
  const { data: invitation, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('invite_code', id)
    .single()

  // If no invitation found or it's expired/used → redirect to error
  if (error || !invitation) {
    redirect('/Error/auth')
  }

  const now = new Date()
  const expiresAt = new Date(invitation.expires_at)

  if (expiresAt < now || invitation.status === 'expired') {
    // Update status to expired if it wasn't already
    if (invitation.status !== 'expired') {
      await supabase
        .from('invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id)
    }
    redirect('/Error/auth')
  }

  // If already accepted → redirect to error
  if (invitation.status === 'accepted') {
    redirect('/Error/auth')
  }

  return (
    <section>
      <RegisterationCard invitation={invitation} />
    </section>
  )
}
