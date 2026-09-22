import GeneralCard from "../cards/GeneralCard"
import CardHeader from "../cards/CardHeader"
import CardBasedText from "../cards/CardBasedText"
import { createClient } from '@supabase/supabase-js'

export default async function SummaryData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_SERVICE_ROLE_KEY
  );

  // Fetch all counts in parallel
  const [totalRes, acceptedRes, pendingRes, expiredRes] = await Promise.all([
    supabase.from('invitations').select('*', { count: 'exact', head: true }),
    supabase.from('invitations').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
    supabase.from('invitations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('invitations').select('*', { count: 'exact', head: true }).lt('expires_at', new Date().toISOString()),
  ])

  const total = totalRes.count || 0
  const accepted = acceptedRes.count || 0
  const pending = pendingRes.count || 0
  const expired = expiredRes.count || 0
  const acceptedRate = total > 0 ? Math.round((accepted / total) * 100) : 0

  return (
    <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        <GeneralCard className="grid gap-5 p-5">
            <CardBasedText className="text-gray-500 font-semibold">Invited Admin Accounts</CardBasedText>
            <div className="flex items-center justify-between">
            <CardHeader>{total}</CardHeader>
            <CardBasedText className="default-banner text-xs font-semibold">Total Invites</CardBasedText>
            </div>
        </GeneralCard>
        
        <GeneralCard className="grid gap-5 p-5">
            <CardBasedText className="text-gray-500 font-semibold">Accepted Invitations</CardBasedText>
            <div className="flex items-center justify-between">
            <CardHeader className="text-green-500">{accepted}</CardHeader>
            <CardBasedText className="default-banner-green text-xs font-semibold">{acceptedRate}% Rate</CardBasedText>
            </div>
        </GeneralCard>
        
        <GeneralCard className="grid gap-5 p-5">
            <CardBasedText className="text-gray-500 font-semibold">Pending Invitations</CardBasedText>
            <div className="flex items-center justify-between">
            <CardHeader className="text-amber-500">{pending}</CardHeader>
            <CardBasedText className="default-banner-amber text-xs font-semibold">Action Required</CardBasedText>
            </div>
        </GeneralCard>

        <GeneralCard className="grid gap-5 p-5">
            <CardBasedText className="text-gray-500 font-semibold">Expired Invitations</CardBasedText>
            <div className="flex items-center justify-between">
            <CardHeader className="text-red-500">{expired}</CardHeader>
            <CardBasedText className="default-banner-red text-xs font-semibold">Expired</CardBasedText>
            </div>
        </GeneralCard>
    </section>
  )
}