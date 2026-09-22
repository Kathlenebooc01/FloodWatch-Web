"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/supabase/util/supabase"
import GeneralCard from "@/components/cards/GeneralCard"
import CardSubHeader from "@/components/cards/CardSubHeader"
import CardBasedText from "@/components/cards/CardBasedText"
import GeneralInput from "@/components/forms/GeneralInput"
import PrimaryButton from "@/components/button/PrimaryButton"
import { X, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react"

export default function ProfileEditForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null) // { type: 'success' | 'error', text: string }

  // Fetch current user email on load
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setEmail(user.email)
      }
    }
    getUser()
  }, [])

  const handleSaveChanges = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const updates = {}
      
      // Only add to updates if field is changed
      if (email) {
        const { data: { user } } = await supabase.auth.getUser()
        if (email !== user?.email) {
          updates.email = email
        }
      }

      if (newPassword) {
        if (newPassword.length < 6) {
          throw new Error("New password must be at least 6 characters.")
        }
        updates.password = newPassword
      }

      if (Object.keys(updates).length === 0) {
        setMessage({ type: 'error', text: 'No changes detected.' })
        setLoading(false)
        return
      }

      const { error } = await supabase.auth.updateUser(updates)

      if (error) throw error

      setMessage({ 
        type: 'success', 
        text: updates.email 
          ? 'Profile updated! Check your new AND old email for confirmation links.' 
          : 'Password updated successfully!' 
      })
      
      // Clear password fields
      setPassword("")
      setNewPassword("")
      
      // Close modal after success (optional delay)
      setTimeout(() => {
        // router.back() // Uncomment if you want it to close automatically
      }, 2000)

    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <GeneralCard className="w-full max-w-md p-8 relative bg-white rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-300">
      <button 
        onClick={() => router.back()}
        className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
        disabled={loading}
      >
        <X className="w-5 h-5 text-gray-400" />
      </button>
      
      <div className="flex flex-col gap-8">
        <CardSubHeader className="text-2xl">Edit Profile</CardSubHeader>
        
        {message && (
          <div className={`p-4 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-300 ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="size-5 shrink-0" /> : <AlertCircle className="size-5 shrink-0" />}
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        <form onSubmit={handleSaveChanges} className="flex flex-col gap-6">
          {/* Change Email */}
          <div className="flex flex-col gap-2">
            <CardBasedText className="text-sm font-semibold text-gray-700">Change Email</CardBasedText>
            <GeneralInput 
              type="email"
              placeholder="Enter new email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            >
              <Mail className="size-5 text-gray-400" />
            </GeneralInput>
          </div>

          <div className="h-px bg-gray-100 w-full my-1"></div>

          {/* Change Password */}
          <div className="flex flex-col gap-4">
            <CardBasedText className="text-sm font-semibold text-gray-700">Change Password</CardBasedText>
            
            <div className="flex flex-col gap-2">
              <CardBasedText className="text-xs text-gray-500 font-semibold">New Password</CardBasedText>
              <GeneralInput 
                type={showNewPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                iconRight={
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="cursor-pointer px-1">
                    {showNewPassword ? <EyeOff className="size-5 text-gray-400" /> : <Eye className="size-5 text-gray-400" />}
                  </button>
                }
              >
                <Lock className="size-5 text-gray-400" />
              </GeneralInput>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <button 
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            <PrimaryButton 
              type="submit" 
              className="px-8 py-2.5 rounded-xl flex items-center gap-2 min-w-[140px] justify-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : "Save Changes"}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </GeneralCard>
  )
}
