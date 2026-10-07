"use client"
import { useState, useEffect } from "react"
import GeneralCard from "@/components/cards/GeneralCard"
import { Package, ChevronRight } from "lucide-react"
import CardSubHeader from "@/components/cards/CardSubHeader"
import CardBasedText from "@/components/cards/CardBasedText"
import { supabase } from "@/supabase/util/supabase"
import { format } from "date-fns"
import Link from "next/link"
import { statusVariants, requestStatusLabel } from "@/lib/domain-values.mjs"
import { fetchHighUrgencyRequests } from "@/lib/emergency-requests.mjs"

export default function PendingListSummary() {
  const [topPending, setTopPending] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchTopPending = async (showLoading = true) => {
    if (showLoading) setIsLoading(true)
    try {
      const requests = await fetchHighUrgencyRequests(supabase, AbortSignal.timeout(10000))
      setTopPending(requests.find(request => statusVariants(['Pending', 'Pending_Dispatch']).includes(request.status)) || null)
    } catch (error) {
      console.error('Unable to sync pending High urgency requests:', error)
    } finally { setIsLoading(false) }
  }

  useEffect(() => {
    const initialFetch = setTimeout(() => fetchTopPending(), 0)
    const syncTimer = setInterval(() => { if (document.visibilityState === 'visible') fetchTopPending(false) }, 5000)

    const channel = supabase
      .channel('pending-list-summary-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_requests' }, () => fetchTopPending(false))
      .subscribe()

    return () => {
      clearTimeout(initialFetch)
      clearInterval(syncTimer)
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <GeneralCard className="p-5 flex flex-col justify-between gap-4 border border-gray-200 bg-white">
      <div className="flex justify-between items-center pb-3 border-b border-gray-100">
        <div>
          <CardSubHeader>Pending Request</CardSubHeader>
          <CardBasedText className="text-gray-400 text-xs font-semibold">Latest high-urgency request requiring attention</CardBasedText>
        </div>
        <div className="summary-data-icon-amber">
          <Package className="size-5" />
        </div>
      </div>

      {isLoading ? (
        <div className="py-3 flex flex-col gap-2 animate-pulse">
          <div className="w-2/3 h-4 bg-gray-200 rounded"></div>
          <div className="w-1/2 h-3 bg-gray-100 rounded"></div>
        </div>
      ) : topPending ? (
        <Link 
          href={`/provincial-admin/utilities/request/view-request?id=${topPending.request_id}`}
          className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl flex flex-col gap-2 transition-all hover:bg-amber-50 hover:border-amber-300 group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-gray-800 line-clamp-1">
              Request #{topPending.request_id?.substring(0, 8)}
            </span>
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 font-extrabold text-[10px] uppercase rounded-full border border-amber-200">
              {requestStatusLabel(topPending.status)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-600 font-medium pt-1">
            <span>
              By <strong className="text-gray-800">{topPending.profiles?.full_name || topPending.municipality_or_city?.name || 'Unknown User'}</strong>
            </span>
            <span className="text-gray-400 font-normal">
              {topPending.created_at ? format(new Date(topPending.created_at), 'MMM dd, yyyy') : ''}
            </span>
          </div>

          <div className="flex items-center justify-end gap-1 text-xs font-bold text-amber-700 pt-1 group-hover:translate-x-0.5 transition-transform">
            <span>Review Request</span>
            <ChevronRight className="size-3.5" />
          </div>
        </Link>
      ) : (
        <div className="py-4 text-center text-xs text-gray-400 bg-gray-50/60 border border-dashed border-gray-200 rounded-xl">
          No pending requests at the moment.
        </div>
      )}
    </GeneralCard>
  )
}
