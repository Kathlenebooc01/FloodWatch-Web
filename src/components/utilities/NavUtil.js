"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/supabase/util/supabase"
import { statusVariants } from "@/lib/domain-values.mjs"
import { getProvincialPageViewedAt, markProvincialPageSeen } from "@/lib/notifications/provincialPageSeen.mjs"
import ToogleButton from "../button/ToogleButton"
import ToogleButtonLayout from "../button/ToogleButtonLayout"

const navLinks = [
  { name: "Dashboard", href: "/provincial-admin/utilities/dashboard" },
  { name: "Inventory", href: "/provincial-admin/utilities/inventory" },
  { name: "Request", href: "/provincial-admin/utilities/request", badge: true },
  { name: "Flagged LGUs", href: "/provincial-admin/utilities/flagged-lgus" }
]

export default function NavUtil() {
  const pathname = usePathname()
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)

  const isViewingRequest = pathname?.startsWith('/provincial-admin/utilities/request')

  useEffect(() => {
    if (isViewingRequest) {
      markProvincialPageSeen(supabase, 'request').catch((err) => console.error("Error marking Request page seen:", err))
    }
  }, [isViewingRequest])

  const fetchPendingRequests = useCallback(async () => {
    try {
      const lastRequestView = await getProvincialPageViewedAt(supabase, 'request')
      let query = supabase
        .from('resource_requests')
        .select('*', { count: 'exact', head: true })
        .in('status', statusVariants(['Pending']))
      
      if (lastRequestView) {
        query = query.gt('created_at', lastRequestView)
      }

      const { count, error } = await query
      
      if (error) throw error
      setPendingRequestsCount(isViewingRequest ? 0 : (count ?? 0))
    } catch (err) {
      console.error("Error fetching pending requests for NavUtil:", err)
    }
  }, [isViewingRequest])

  useEffect(() => {
    const initialFetch = setTimeout(() => fetchPendingRequests(), 0)

    const handleViewed = () => fetchPendingRequests()
    window.addEventListener("fw_notification_viewed", handleViewed)

    const channel = supabase
      .channel('navutil_requests_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_requests' }, () => {
        fetchPendingRequests()
      })
      .subscribe()

    const pollInterval = setInterval(() => {
      fetchPendingRequests()
    }, 30000)

    return () => {
      clearTimeout(initialFetch)
      window.removeEventListener("fw_notification_viewed", handleViewed)
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [fetchPendingRequests])

  return (
    <ToogleButtonLayout className='gap-5'>
      {navLinks.map((link) => {
        const isActive = pathname?.startsWith(link.href)
        return (
          <ToogleButton key={link.name} className={isActive ? "button-toogle-active" : ""}>
            <Link 
              href={link.href} 
              className="w-full flex items-center justify-center gap-2"
            >
              <span>{link.name}</span>
              {link.badge && !isViewingRequest && pendingRequestsCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-red-600 rounded-full shadow-2xs animate-pulse">
                  {pendingRequestsCount > 99 ? '99+' : pendingRequestsCount}
                </span>
              )}
            </Link>
          </ToogleButton>
        )
      })}
    </ToogleButtonLayout>
  )
}
