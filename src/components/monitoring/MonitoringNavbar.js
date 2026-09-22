"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const navLinks = [
  { name: "Weather", href: "/provincial-admin/monitoring", exact: true },
  { name: "Air", href: "/provincial-admin/monitoring/air-map" },
  { name: "Heat Index", href: "/provincial-admin/monitoring/heat-index-map" },
  { name: "Hazards", href: "/provincial-admin/monitoring/hazard-map" },
  { name: "Report", href: "/provincial-admin/monitoring/report-map" },
  { name: "LGU", href: "/provincial-admin/monitoring/lgu-monitoring" }
]

export default function MonitoringNavbar() {
  const pathname = usePathname()

  return (
    <nav className="w-full overflow-x-auto no-scrollbar py-1">
      <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl min-w-max w-fit lg:w-2xl">
        {navLinks.map((link) => {
          const isActive = link.exact
            ? pathname === link.href || pathname === `${link.href}/`
            : pathname?.startsWith(link.href)

          return (
            <Link
              key={link.name}
              href={link.href}
              className={`shrink-0 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 text-center select-none flex-1 min-w-[72px] sm:min-w-[85px] ${
                isActive
                  ? "bg-white text-primary shadow-xs font-bold"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"
              }`}
            >
              {link.name}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

