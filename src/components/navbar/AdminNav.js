"use client"
import VerticalLayout from "./VerticalLayout"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "@/supabase/util/supabase"
import AccountButton from "../button/AccountButton"
import { useState, useEffect } from "react"
import Image from "next/image"
import EmblemLogo from "@/assets/images/logofloodwatch.png"
import NationalNav from "./NationalNav"
import ProvincialNav from "./ProvincialNav"

export default function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [fullName, setFullName] = useState('Admin')
  const [userRole, setUserRole] = useState('Manage Account')

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session) return

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', session.user.id)
          .single()

        if (profileError) {
          console.error('Error fetching profile:', profileError)
          return
        }

        if (profile?.full_name) {
          setFullName(profile.full_name)
        }
        
        if (profile?.role) {
          const formattedRole = profile.role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
          setUserRole(formattedRole)
        }
      } catch (error) {
        console.error('Unexpected error fetching profile:', error)
      }
    }

    fetchUserProfile()
  }, [])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const isNational = pathname?.startsWith('/national-admin')
  const isProvincial = pathname?.startsWith('/provincial-admin')

  return (
    <VerticalLayout>
      <div className="flex flex-col w-full h-full justify-between">
        {/* Desktop Header */}
        <section className="hidden gap-2 md:flex items-start justify-start p-6 border-b border-gray-100">
          <Image src={EmblemLogo} alt="Emblem Logo"/>
          <h1 className="text-xl flex flex-col font-bold">
            <span className="text-primary">{isProvincial ? "Provincial" : "National"}</span>
            <span className="text-secondary">Admin</span>
          </h1>
        </section>

        {/* Navigation Links */}
        <nav className="flex-1 w-full flex items-center md:items-start no-scrollbar">
          {isNational && <NationalNav />}
          {isProvincial && <ProvincialNav />}
        </nav>

        {/* Desktop Footer (Account) */}
        <AccountButton
          isDrawerOpen={isDrawerOpen}
          setIsDrawerOpen={setIsDrawerOpen}
          fullName={fullName}
          userRole={userRole}
          handleSignOut={handleSignOut}
        />
      </div>
    </VerticalLayout>
  )
}
