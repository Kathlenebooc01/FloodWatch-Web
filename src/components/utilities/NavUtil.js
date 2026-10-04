"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/supabase/util/supabase"
import { getStoredViewTime, setStoredViewTime, NOTIF_KEYS } from "@/lib/notifications/unreadTracker"
import ToogleButton from "../button/ToogleButton"
import ToogleButtonLayout from "../button/ToogleButtonLayout"

const navLinks = [
  { name: "Dashboard", href: "/provincial-admin/utilities/dashboard" },
  { name: "Inventory", href: "/provincial-admin/utilities/inventory" },
  { name: "Request", href: "/provincial-admin/utilities/request", badge: true }
]

export default function NavUtil() {
  const pathname = usePathname()
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)

  const isViewingRequest = pathname?.startsWith('/provincial-admin/utilities/request')

  useEffect(() => {
    if (isViewingRequest) {
      setStoredViewTime(NOTIF_KEYS.REQUEST)
      setPendingRequestsCount(0)
    }
  }, [isViewingRequest])

  const fetchPendingRequests = useCallback(async () => {
    try {
      const lastRequestView = getStoredViewTime(NOTIF_KEYS.REQUEST)
      let query = supabase
        .from('resource_requests')
        .select('*', { count: 'exact', head: true })
        .in('status', ['Pending', 'pending'])
      
      if (lastRequestView) {
        query = query.gt('created_at', lastRequestView)
      }

      const { count, error } = await query
      
      if (!error && count !== null && !isViewingRequest) {
        setPendingRequestsCount(count)
      }
    } catch (err) {
      console.error("Error fetching pending requests for NavUtil:", err)
    }
  }, [isViewingRequest])

  useEffect(() => {
    fetchPendingRequests()

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
    }, 5000)

    return () => {
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
              onClick={() => {
                if (link.badge) {
                  setStoredViewTime(NOTIF_KEYS.REQUEST)
                  setPendingRequestsCount(0)
                }
              }}
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
