import SideModal from "../Modal/SideModal"
import CardHeader from "../cards/CardHeader"
import { X } from "lucide-react"
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import HistoryLazyItem from "./HistoryLazyItem"
export default async function HistoryModal() {
  // Use the service role key to bypass RLS on the server
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_SERVICE_ROLE_KEY
  );

  // Fetch telemetry history joined with the municipality name
  const { data: history } = await supabase
    .from('weather_telemetry')
    .select(`
      added_on,
      municipality_or_city (
        name
      )
    `)
    .order('added_on', { ascending: false })
    .limit(100);

  return (
    <SideModal>
        <div className="flex gap-3 w-full items-center sticky top-0 bg-white  p-6 z-10">
            <Link href="?" className="modal-icon-button">
                <X className="w-4 h-4 text-gray-600" />
            </Link>
            <CardHeader className="text-lg">Telemetry History</CardHeader>
        </div>
        
        <div className="flex flex-col gap-2 p-5 overflow-y-auto">
            {history?.length > 0 ? (
                history.map((item, index) => (
                    <HistoryLazyItem key={index} item={item} />
                ))
            ) : (
                <div className="text-center text-gray-500 py-10 text-sm">
                    No history recorded yet.
                </div>
            )}
        </div>
    </SideModal>
  )
}
