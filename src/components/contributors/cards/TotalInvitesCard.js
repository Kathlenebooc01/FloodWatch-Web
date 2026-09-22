import GeneralCard from "../../cards/GeneralCard"
import CardHeader from "../../cards/CardHeader"
import CardBasedText from "../../cards/CardBasedText"
import { createClient } from '@supabase/supabase-js'

export default async function TotalInvitesCard() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_SERVICE_ROLE_KEY
  );

  const { count } = await supabase
    .from('invitations')
    .select('*', { count: 'exact', head: true })

  const total = count || 0

  return (
    <GeneralCard className="grid gap-5 p-5">
      <CardBasedText className="text-gray-500 font-semibold">Invited Admin Accounts</CardBasedText>
      <div className="flex items-center justify-between">
        <CardHeader>{total}</CardHeader>
        <CardBasedText className="default-banner text-xs font-semibold">Total Invites</CardBasedText>
      </div>
    </GeneralCard>
  )
}
