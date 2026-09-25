"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Radar, Calendar, Archive, Presentation } from "lucide-react"

export default function ProvincialNav() {
  const pathname = usePathname()
  const navItems = [
    { name: 'Dashboard', href: '/provincial-admin/dashboard', icon: LayoutDashboard },
    { name: 'Monitoring', href: '/provincial-admin/monitoring', icon: Radar },
    { name: 'Schedule', href: '/provincial-admin/schedule', icon: Calendar },
    { name: 'Utilities', href: '/provincial-admin/utilities/dashboard', basePath: '/provincial-admin/utilities', icon: Archive },
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
