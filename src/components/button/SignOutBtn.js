
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/supabase/util/supabase"
import { LogOut, Loader2 } from "lucide-react"

export default function SignOutBtn() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    try {
      setLoading(true)
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button 
      onClick={handleSignOut} 
      disabled={loading}
      className="flex cursor-pointer items-center justify-center gap-3 w-full p-2.5 rounded-xl text-red-600 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
      ) : (
        <LogOut className="w-5 h-5 text-red-500" />
      )}
      <span className="text-sm font-semibold">{loading ? "Signing Out..." : "Sign Out"}</span>
    </button>
  )
}
