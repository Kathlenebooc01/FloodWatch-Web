"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import ToogleButton from "../button/ToogleButton"
import ToogleButtonLayout from "../button/ToogleButtonLayout"

const navLinks = [
  { name: "Dashboard", href: "/provincial-admin/utilities/dashboard" },
  { name: "Inventory", href: "/provincial-admin/utilities/inventory" },
  { name: "Request", href: "/provincial-admin/utilities/request" }
]

export default function NavUtil() {
  const pathname = usePathname()

  return (
    <ToogleButtonLayout className='gap-5'>
      {navLinks.map((link) => {
        const isActive = pathname?.startsWith(link.href)
        return (
          <ToogleButton key={link.name} className={isActive ? "button-toogle-active" : ""}>
            <Link href={link.href} className="w-full block">
              {link.name}
            </Link>
          </ToogleButton>
        )
      })}
    </ToogleButtonLayout>
  )
}
