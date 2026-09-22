"use client"
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Webhook, UserSearch } from 'lucide-react'

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="mb-2">
        <ul className='flex items-center gap-5 text-gray-500 font-semibold border-b border-gray-100 pb-2'>
            <li className={`flex items-center gap-2 duration-300 border-b-2 pb-1 ${pathname === '/national-admin/Logs/api' ? 'text-primary border-primary' : 'border-transparent hover:text-primary'}`}>
                <Webhook className="size-5"/>
                <Link href="/national-admin/Logs/api">API Logs</Link>
            </li>
            <li className={`flex items-center gap-2 duration-300 border-b-2 pb-1 ${pathname === '/national-admin/Logs/users' ? 'text-primary border-primary' : 'border-transparent hover:text-primary'}`}>
                <UserSearch className="size-5"/>
                <Link href="/national-admin/Logs/users">User Logs</Link>
            </li>
        </ul>
    </nav>
  )
}
