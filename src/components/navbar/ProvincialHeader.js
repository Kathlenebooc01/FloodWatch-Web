"use client"

import { Origami, Bell, User, Sparkle } from "lucide-react"
import Link from "next/link"
import RouteHeader from "./RouteHeader"
import { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "@/supabase/util/supabase"

export default function ProvincialHeader() {
  const [unreadCount, setUnreadCount] = useState(0)
  const fetchSequence = useRef(0)

  const refreshUnreadCount = useCallback(async () => {
    const sequence = ++fetchSequence.current
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      if (sequence === fetchSequence.current) setUnreadCount(0)
      return
    }
    const { count, error } = await supabase.from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('target_role', ['all', 'provincial_admin'])
      .eq('is_read', false)
    if (!error && sequence === fetchSequence.current) setUnreadCount(count || 0)
  }, [])

  useEffect(() => {
    const initialFetch = setTimeout(refreshUnreadCount, 0)
    window.addEventListener('fw_notification_viewed', refreshUnreadCount)
    const channel = supabase.channel('provincial_header_notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, refreshUnreadCount)
      .subscribe()
    return () => {
      clearTimeout(initialFetch)
      window.removeEventListener('fw_notification_viewed', refreshUnreadCount)
      supabase.removeChannel(channel)
    }
  }, [refreshUnreadCount])

  return (
    <section className="flex w-full justify-between items-stretch">
        
            <RouteHeader/>
        
        <div className="flex gap-1 items-center">
        <Link href='/provincial-admin/lantaw' className="navheader-button relative">
            <Origami className="text-xs"/>
            <Sparkle className="size-4 absolute top-0 left-0 right-1 fill-primary/50"/>
        </Link>
        <Link href='/provincial-admin/account' className="navheader-button block lg:hidden">
            <User className="text-xs"/>
        </Link>
        <Link href='/provincial-admin/notification' className="navheader-button relative">
            <Bell className="text-xs"/>
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold leading-none flex items-center justify-center shadow-sm pointer-events-none" aria-label={`${unreadCount} unread notifications`}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
        </Link>
        </div>
    </section>
  )
}
