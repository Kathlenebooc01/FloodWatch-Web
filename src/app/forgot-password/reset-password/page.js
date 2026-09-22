"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/supabase/util/supabase"

import GeneralCard from "@/components/cards/GeneralCard"
import GeneralInput from "@/components/forms/GeneralInput"
import CardSubHeader from "@/components/cards/CardSubHeader"
import CardBasedText from "@/components/cards/CardBasedText"
import PrimaryButton from "@/components/button/PrimaryButton"
import { Lock, Eye, EyeOff, CheckCircle2, ChevronRight } from "lucide-react"
import Link from "next/link"

export default function ResetPasswordPage() {
  const router = useRouter()

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: "", text: "" })
  const [success, setSuccess] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [checking, setChecking] = useState(true)

  // Verify that the user has an active recovery session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const isAllowed = sessionStorage.getItem('allowPasswordReset')
      
      if (!session || !isAllowed) {
        // No active session or bypassed OTP — reject access
        router.push('/Error/auth')
        return
      }
      
      setAuthorized(true)
      setChecking(false)
    }

    checkSession()
  }, [router])

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    setMessage({ type: "", text: "" })

    if (newPassword.length < 6) {
      return setMessage({ type: "error", text: "Password must be at least 6 characters." })
    }

    if (newPassword !== confirmPassword) {
      return setMessage({ type: "error", text: "Passwords do not match." })
    }
    
    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      setMessage({ type: "error", text: error.message })
    } else {
      // Sign out the recovery session so they log in fresh
      sessionStorage.removeItem('allowPasswordReset')
      await supabase.auth.signOut()
      setSuccess(true)
    }
    setLoading(false)
  }

  if (checking) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!authorized) return null

  return (
    <GeneralCard className='w-full lg:w-lg'>
      <div className="grid gap-4">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-3">
            <span className="summary-data-icon">
              {success ? <CheckCircle2 className="size-5 text-green-500"/> : <Lock className="size-5"/>}
            </span>
            <div>
              <CardSubHeader>{success ? "Password Updated" : "Reset Password"}</CardSubHeader>
              <CardBasedText className='text-gray-500'>
                {success ? "You can now log in with your new password" : "Create a new, strong password"}
              </CardBasedText>
            </div>
          </div>
        </div>

        {/* ERROR / SUCCESS ALERTS */}
        {message.text && (
          <div className={`p-3 rounded-lg text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
            {message.text}
          </div>
        )}

        {!success ? (
          <form onSubmit={handleUpdatePassword} className="grid gap-4">
            <div>
              <CardBasedText className="font-medium">New Password</CardBasedText>
              <GeneralInput 
                placeholder="Enter new password" 
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                required
                iconRight={
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="focus:outline-none cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="size-5 text-gray-500 hover:text-gray-700 transition-colors"/>
                    ) : (
                      <Eye className="size-5 text-gray-500 hover:text-gray-700 transition-colors"/>
                    )}
                  </button>
                }
              />
            </div>
            <div>
              <CardBasedText className="font-medium">Confirm Password</CardBasedText>
              <GeneralInput 
                placeholder="Confirm new password" 
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
                iconRight={
                  <button 
                    type="button" 
                    onClick={() => setShowConfirm(!showConfirm)} 
                    className="focus:outline-none cursor-pointer"
                  >
                    {showConfirm ? (
                      <EyeOff className="size-5 text-gray-500 hover:text-gray-700 transition-colors"/>
                    ) : (
                      <Eye className="size-5 text-gray-500 hover:text-gray-700 transition-colors"/>
                    )}
                  </button>
                }
              />
            </div>
            <PrimaryButton 
              type="submit"
              className='flex gap-3 items-center justify-center' 
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Password"} <Lock className="size-5"/>
            </PrimaryButton>
          </form>
        ) : (
          <Link href="/login" className="w-full">
            <PrimaryButton className='w-full flex justify-center gap-2 items-center'>
              Return to Login <ChevronRight className="size-5"/>
            </PrimaryButton>
          </Link>
        )}
      </div>
    </GeneralCard>
  )
}
