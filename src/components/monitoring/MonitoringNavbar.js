"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/supabase/util/supabase"
import { getStoredViewTime, setStoredViewTime, NOTIF_KEYS } from "@/lib/notifications/unreadTracker"

const navLinks = [
  { name: "Weather", href: "/provincial-admin/monitoring", exact: true },
  { name: "Air", href: "/provincial-admin/monitoring/air-map" },
  { name: "Heat Index", href: "/provincial-admin/monitoring/heat-index-map" },
  { name: "Hazards", href: "/provincial-admin/monitoring/hazard-map" },
  { name: "Report", href: "/provincial-admin/monitoring/report-map", badgeKey: "report" },
  { name: "LGU", href: "/provincial-admin/monitoring/lgu-monitoring", badgeKey: "lgu" }
]

const ACTIVE_REPORT_STATUSES = [
  "Pending_AI", "pending_ai",
  "Ready_For_LGU", "Ready_for_LGU", "ready_for_lgu",
  "Pending", "pending",
  "Submitted", "submitted",
  "Under_Review", "under_review"
]

export default function MonitoringNavbar() {
  const pathname = usePathname()
  const [reportCount, setReportCount] = useState(0)
  const [lguCount, setLguCount] = useState(0)

  const isViewingReport = pathname?.startsWith("/provincial-admin/monitoring/report-map")
  const isViewingLgu = pathname?.startsWith("/provincial-admin/monitoring/lgu-monitoring")

  // Auto-mark as viewed when the user visits the respective tab
  useEffect(() => {
    if (isViewingReport) {
      setStoredViewTime(NOTIF_KEYS.REPORT)
      setReportCount(0)
    }
  }, [isViewingReport])

  useEffect(() => {
    if (isViewingLgu) {
      setStoredViewTime(NOTIF_KEYS.LGU)
      setLguCount(0)
    }
  }, [isViewingLgu])

  const fetchCounts = useCallback(async () => {
    try {
      const lastReportView = getStoredViewTime(NOTIF_KEYS.REPORT)
      const lastLguView = getStoredViewTime(NOTIF_KEYS.LGU)

      // 1. Report tab badge — citizen reports only
      let repQuery = supabase
        .from("incident_report")
        .select("report_id, profiles!user_id!inner(role)", { count: "exact", head: true })
        .eq("profiles.role", "citizen")
        .in("status", ACTIVE_REPORT_STATUSES)

      if (lastReportView) {
        repQuery = repQuery.gt("created_at", lastReportView)
      }

      // 2. LGU tab badge — active situational/incident reports + distress signals
      let lguRepQuery = supabase
        .from("incident_report")
        .select("report_id", { count: "exact", head: true })
        .in("status", ACTIVE_REPORT_STATUSES)

      if (lastLguView) {
        lguRepQuery = lguRepQuery.gt("created_at", lastLguView)
      }

      let disQuery = supabase
        .from("distress_signals")
        .select("distress_id", { count: "exact", head: true })
        .in("status", ["Pending", "pending", "PENDING"])

      if (lastLguView) {
        disQuery = disQuery.gt("created_at", lastLguView)
      }

      const [repRes, lguRepRes, disRes] = await Promise.all([
        repQuery,
        lguRepQuery,
        disQuery
      ])

      if (!isViewingReport && repRes.count !== null) {
        setReportCount(repRes.count)
      }

      if (!isViewingLgu) {
        const totalLguUnread = (lguRepRes.count || 0) + (disRes.count || 0)
        setLguCount(totalLguUnread)
      }
    } catch (err) {
      console.error("Error fetching monitoring tab counts:", err)
    }
  }, [isViewingReport, isViewingLgu])

  useEffect(() => {
    fetchCounts()

    const handleViewed = () => fetchCounts()
    window.addEventListener("fw_notification_viewed", handleViewed)

    // ── Supabase Realtime: instant badge update on new report/distress ──
    // Separate INSERT vs UPDATE/DELETE listeners so new submissions are caught immediately
    const channel = supabase
      .channel("monitoring_tabs_indicator_v2")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "incident_report" }, () => {
        // New report submitted from app — instantly trigger count refresh
        fetchCounts()
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "incident_report" }, () => {
        fetchCounts()
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "distress_signals" }, () => {
        fetchCounts()
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "distress_signals" }, () => {
        fetchCounts()
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[MonitoringNavbar] Realtime channel error, will rely on polling')
        }
      })

    // Aggressive 2s poll as fallback to ensure instant visual update
    const pollInterval = setInterval(() => {
      fetchCounts()
    }, 2000)

    return () => {
      window.removeEventListener("fw_notification_viewed", handleViewed)
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [fetchCounts])

  return (
    <nav className="w-full overflow-x-auto no-scrollbar py-1">
      <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl min-w-max w-fit lg:w-2xl">
        {navLinks.map((link) => {
          const isActive = link.exact
            ? pathname === link.href || pathname === `${link.href}/`
            : pathname?.startsWith(link.href)

          const count = link.badgeKey === "report" 
            ? (isViewingReport ? 0 : reportCount)
            : link.badgeKey === "lgu" 
              ? (isViewingLgu ? 0 : lguCount) 
              : 0

          return (
            <Link
              key={link.name}
              href={link.href}
              prefetch={true}
              onClick={() => {
                if (link.badgeKey === "report") {
                  setStoredViewTime(NOTIF_KEYS.REPORT)
                  setReportCount(0)
                } else if (link.badgeKey === "lgu") {
                  setStoredViewTime(NOTIF_KEYS.LGU)
                  setLguCount(0)
                }
              }}
              className={`relative shrink-0 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 text-center select-none flex-1 min-w-[72px] sm:min-w-[85px] flex items-center justify-center gap-1.5 ${
                isActive
                  ? "bg-white text-primary shadow-xs font-bold"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"
              }`}
            >
              <span>{link.name}</span>
              {count > 0 && (
                <span className="relative flex items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-3.5 w-3.5 rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-600 rounded-full shadow-xs">
                    {count > 99 ? "99+" : count}
                  </span>
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}


