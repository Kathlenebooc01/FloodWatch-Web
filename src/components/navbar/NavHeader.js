"use client"
import { useState, useEffect, useCallback } from "react"
import GlassCard from "../cards/GlassCard"
import RouteHeader from "./RouteHeader"
import CardBasedText from "../cards/CardBasedText"
import {User,Bell} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { supabase } from "@/supabase/util/supabase"
import { ROLES } from "@/lib/domain-values.mjs"
import { getProvincialPageViewedAt, markProvincialPageSeen } from "@/lib/notifications/provincialPageSeen.mjs"

export default function NavHeader() {
  const pathname = usePathname()
  const basePath = pathname?.startsWith('/provincial-admin') ? '/provincial-admin' : '/national-admin'
  const role = basePath === '/provincial-admin' ? ROLES.PROVINCIAL_ADMIN : ROLES.NATIONAL_ADMIN
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(false)
  const isViewingNotifications = pathname?.startsWith(`${basePath}/notification`)

  useEffect(() => {
    if (role === ROLES.PROVINCIAL_ADMIN && isViewingNotifications) {
      markProvincialPageSeen(supabase, 'notification').catch((err) => console.error('Error marking notifications page seen:', err))
    }
  }, [role, isViewingNotifications])

  const fetchUnreadNotifsStatus = useCallback(async () => {
    const lastView = role === ROLES.PROVINCIAL_ADMIN
      ? await getProvincialPageViewedAt(supabase, 'notification')
      : null
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .in('target_role', ['all', role])
    if (role === ROLES.PROVINCIAL_ADMIN) {
      query = query.is('source_event', null)
      if (lastView) query = query.gt('created_at', lastView)
    } else {
      query = query.eq('is_read', false)
    }
    const { count, error } = await query
    let submissionCount = 0
    if (role === ROLES.PROVINCIAL_ADMIN) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const result = await supabase.from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .in('source_event', ['citizen_report', 'lgu_report', 'lgu_utility_request'])
          .eq('is_read', false)
        if (!result.error) submissionCount = result.count || 0
      }
    }

    if (!error) {
      setHasUnreadNotifs((role !== ROLES.PROVINCIAL_ADMIN || !isViewingNotifications) && (count + submissionCount) > 0)
    }
  }, [role, isViewingNotifications])

  useEffect(() => {
    const initialFetch = setTimeout(() => fetchUnreadNotifsStatus(), 0)
    window.addEventListener('fw_notification_viewed', fetchUnreadNotifsStatus)

    const notifChannel = supabase
      .channel('navheader_notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => {
        fetchUnreadNotifsStatus()
      })
      .subscribe()

    return () => {
      clearTimeout(initialFetch)
      window.removeEventListener('fw_notification_viewed', fetchUnreadNotifsStatus)
      supabase.removeChannel(notifChannel)
    }
  }, [fetchUnreadNotifsStatus])

  // On app open: query realtime OpenWeather telemetry for user location once per session
  useEffect(() => {
    const sessionKey = 'floodwatch_weather_session_logged';
    if (typeof window === 'undefined' || sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');

    async function triggerWeatherFetch() {
      try {
        const res = await fetch('/api/hazard-telemetry?source=app_open');
        if (res.ok) {
          const json = await res.json();
          const primary = json?.stations?.[0];
          if (primary) {
            // Log the app-open weather fetch to API activity history
            const { trackApiUsage } = await import('@/lib/logs/clientTracker');
            trackApiUsage({
              apiType: 'weather',
              eventType: 'Execution',
              message: `[OpenWeather API] App opened \u2014 weather fetched for ${primary.name}: ${primary.temp_c}\u00b0C, ${primary.condition}, Rain: ${primary.rain_1h_mm}mm/h | STATUS:200`,
              throttleKey: 'weather:app_open_session',
              throttleMs: 300000 // 5 minutes throttle for this specific log
            });
          }
        }
      } catch (err) {
        console.debug('Initial weather telemetry fetch error:', err);
      }
    }
    triggerWeatherFetch();
  }, []);

  return (
    <section className="flex w-full justify-between items-center gap-2 sticky top-2 z-20">
       <RouteHeader/>
        <div className="flex items-stretch gap-2">
            <div className="navheader-button lg:hidden">
                <Link href={`${basePath}/account`}>
                    <div className="text-xs">
                        <User/> 
                    </div>
                </Link>  
            </div>
           
            <Link href={`${basePath}/notification`} className="navheader-button relative">
                <div className="text-xs">
                <Bell className=""/> 
                {hasUnreadNotifs && <span className="notif-banner"></span>}
                </div>
            </Link>
          
        </div>
    </section>
  )
}
