"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { LayoutDashboard, Radar, Calendar, Archive, Presentation, IdCard } from "lucide-react"
import { supabase } from "@/supabase/util/supabase"

export default function ProvincialNav() {
  const pathname = usePathname()
  const [hasUnread, setHasUnread] = useState(false)

  const fetchUnreadStatus = async () => {
    const { count, error } = await supabase
      .from('id_verification')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
    if (!error) setHasUnread(count > 0)
  }

  useEffect(() => {
    fetchUnreadStatus()
    const handleLocalUpdate = () => fetchUnreadStatus()
    window.addEventListener('verification_status_updated', handleLocalUpdate)

    const channel = supabase
      .channel('navheader_id_verification')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'id_verification' }, () => {
        fetchUnreadStatus()
      })
      .subscribe()

    return () => {
      window.removeEventListener('verification_status_updated', handleLocalUpdate)
      supabase.removeChannel(channel)
    }
  }, [])
  
  const navItems = [
    { name: 'Dashboard', href: '/provincial-admin/dashboard', icon: LayoutDashboard },
    { name: 'Monitoring', href: '/provincial-admin/monitoring', icon: Radar },
    { name: 'Schedule', href: '/provincial-admin/schedule', icon: Calendar },
    { name: 'Utilities', href: '/provincial-admin/utilities/dashboard', basePath: '/provincial-admin/utilities', icon: Archive },
    { name: 'Board', href: '/provincial-admin/board/news', basePath: '/provincial-admin/board', icon: Presentation },
    { name: 'Verification', href: '/provincial-admin/id_verification', icon: IdCard, badge: hasUnread },
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
                {item.badge && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-white" />}
              </div>
              <span className="text-[10px] md:text-sm font-semibold">
                {item.name}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
