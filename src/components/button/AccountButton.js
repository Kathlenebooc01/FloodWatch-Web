"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserCircle, LogOut } from "lucide-react"
import DrawerCard from "../cards/DrawerCard"

export default function AccountButton({ isDrawerOpen, setIsDrawerOpen, fullName, userRole, handleSignOut }) {
  const pathname = usePathname()
  
  const accountLink = pathname?.startsWith('/provincial-admin') 
    ? '/provincial-admin/account' 
    : '/national-admin/account'

  return (
    <>
      {isDrawerOpen && (
        <div className="absolute bottom-24 left-4 w-52 z-[60]">
          <DrawerCard className="flex flex-col gap-1 p-3">
            <Link href={accountLink} className="flex cursor-pointer items-center gap-3 w-full p-2 rounded-lg text-gray-700 hover:bg-primary/10 hover:text-primary transition-colors">
              <UserCircle className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-semibold">Go to account</span>
            </Link>
            <div className="h-px w-full bg-gray-400/20 my-1"></div>
            <button onClick={handleSignOut} className="flex cursor-pointer items-center gap-3 w-full p-2 rounded-lg text-red-600 hover:bg-red-500/10 transition-colors">
              <LogOut className="w-5 h-5 text-red-500" />
              <span className="text-sm font-semibold">Sign Out</span>
            </button>
          </DrawerCard>
        </div>
      )}
      <div className="hidden md:flex p-4 border-t border-gray-100 mt-auto relative">
        <button 
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className="flex cursor-pointer items-center gap-3 w-full p-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <UserCircle className="w-8 h-8 text-gray-400" />
          <div className="flex flex-col text-left">
            <span className="text-sm font-semibold text-gray-800">{fullName}</span>
            <span className="text-xs text-gray-400">{userRole}</span>
          </div>
        </button>
      </div>
    </>
  )
}
