"use client"
import { useState, useEffect } from "react"
import GlassCard from "../cards/GlassCard"
import RouteHeader from "./RouteHeader"
import CardBasedText from "../cards/CardBasedText"
import {User,Bell} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { supabase } from "@/supabase/util/supabase"

export default function NavHeader() {
  const pathname = usePathname()
  const basePath = pathname?.startsWith('/provincial-admin') ? '/provincial-admin' : '/national-admin'
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(false)

  const fetchUnreadNotifsStatus = async () => {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .in('target_role', ['all', 'national_admin'])
      .eq('is_read', false)

    if (!error) {
      setHasUnreadNotifs(count > 0)
    }
  }

  useEffect(() => {
    fetchUnreadNotifsStatus()

    const notifChannel = supabase
      .channel('navheader_notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => {
        fetchUnreadNotifsStatus()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(notifChannel)
    }
  }, [])

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
