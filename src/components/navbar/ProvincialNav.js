"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, useCallback, useRef } from "react"
import { LayoutDashboard, Radar, Calendar, Archive, Presentation } from "lucide-react"
import { supabase } from "@/supabase/util/supabase"
import { getStoredViewTime, NOTIF_KEYS } from "@/lib/notifications/unreadTracker"
import { fetchProvincialMonitoringUnreadCounts } from "@/lib/notifications/provincialMonitoringUnread.mjs"

export default function ProvincialNav() {
  const pathname = usePathname()
  const [monitoringCount, setMonitoringCount] = useState(0)
  const [requestsCount, setRequestsCount] = useState(0)
  const latestFetch = useRef(0)

  const fetchBadgeCounts = useCallback(async () => {
    const fetchId = ++latestFetch.current
    try {
      const lastReportView = getStoredViewTime(NOTIF_KEYS.REPORT)
      const lastLguView = getStoredViewTime(NOTIF_KEYS.LGU)
      const lastRequestView = getStoredViewTime(NOTIF_KEYS.REQUEST)

      let reqQuery = supabase
        .from("resource_requests")
        .select("request_id", { count: "exact", head: true })
        .in("status", ["Pending", "pending"])
      if (lastRequestView) reqQuery = reqQuery.gt("created_at", lastRequestView)

      const [monitoring, reqRes] = await Promise.all([
        fetchProvincialMonitoringUnreadCounts(supabase, lastReportView, lastLguView),
        reqQuery,
      ])
      if (reqRes.error) throw reqRes.error
      if (fetchId !== latestFetch.current) return

      setMonitoringCount(monitoring.reportCount + monitoring.lguCount)
      setRequestsCount(reqRes.count || 0)
    } catch (err) {
      console.error("Error fetching provincial nav badge counts:", err)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(fetchBadgeCounts)

    const handleViewed = () => fetchBadgeCounts()
    window.addEventListener("fw_notification_viewed", handleViewed)

    const channel = supabase
      .channel("provincial_nav_badges_v2")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "incident_report" }, () => {
        fetchBadgeCounts()
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "incident_report" }, () => {
        fetchBadgeCounts()
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "distress_signals" }, () => {
        fetchBadgeCounts()
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "distress_signals" }, () => {
        fetchBadgeCounts()
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "resource_requests" }, () => {
        fetchBadgeCounts()
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "resource_requests" }, () => {
        fetchBadgeCounts()
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[ProvincialNav] Realtime channel error, will rely on polling')
        }
      })

    // 2s poll as fallback to guarantee instant visual update
    const pollInterval = setInterval(() => {
      fetchBadgeCounts()
    }, 2000)

    return () => {
      window.removeEventListener("fw_notification_viewed", handleViewed)
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [fetchBadgeCounts])

  const navItems = [
    { name: 'Dashboard', href: '/provincial-admin/dashboard', icon: LayoutDashboard },
    { 
      name: 'Monitoring', 
      href: '/provincial-admin/monitoring', 
      icon: Radar, 
      badge: monitoringCount > 0,
      badgeCount: monitoringCount
    },
    { name: 'Schedule', href: '/provincial-admin/schedule', icon: Calendar },
    { 
      name: 'Utilities', 
      href: '/provincial-admin/utilities/dashboard', 
      basePath: '/provincial-admin/utilities', 
      icon: Archive, 
      badge: requestsCount > 0,
      badgeCount: requestsCount
    },
    { name: 'Board', href: '/provincial-admin/board/news', basePath: '/provincial-admin/board', icon: Presentation },
  ]

  return (
    <ul className="vertical-nav">
      {navItems.map((item) => {
        const Icon = item.icon
        const matchPath = item.basePath || item.href
        const isActive = pathname === item.href || (pathname?.startsWith(matchPath) && matchPath !== '/provincial-admin')
        
        return (
          <li key={item.name} className="flex-1 md:flex-none">
            <Link 
              href={item.href}
              className={`vertical-nav-link ${isActive ? 'vertical-nav-link-active' : 'vertical-nav-link-inactive'}`}
            >
              <div className="relative">
                <Icon className="w-5 h-5 md:w-5 md:h-5" />
                {item.badge && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-80"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600 border border-white shadow-xs"></span>
                  </span>
                )}
              </div>
              <span className="text-[10px] md:text-sm font-semibold flex items-center gap-1.5">
                {item.name}
                {item.badgeCount > 0 && (
                  <span className="hidden md:inline-flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-red-600 rounded-full shadow-2xs">
                    {item.badgeCount > 99 ? '99+' : item.badgeCount}
                  </span>
                )}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

