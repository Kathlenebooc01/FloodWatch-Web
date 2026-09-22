"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import ToogleButton from "@/components/button/ToogleButton"
import ToogleButtonLayout from "@/components/button/ToogleButtonLayout"

export default function Layout({ children }) {
  const pathname = usePathname()

  return (
    <main>
        <ToogleButtonLayout className='max-w-sm mb-4'>
            <ToogleButton active={pathname?.startsWith('/provincial-admin/board/news')}>
                <Link href="/provincial-admin/board/news" className="w-full block">News Board</Link>
            </ToogleButton>
            <ToogleButton active={pathname?.startsWith('/provincial-admin/board/announcement')}>
                <Link href="/provincial-admin/board/announcement" className="w-full block">Announcement Board</Link>
            </ToogleButton>
        </ToogleButtonLayout>
    <div>
      {children}
    </div>
    </main>
  )
}
