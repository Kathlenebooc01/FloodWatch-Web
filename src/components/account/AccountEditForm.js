"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/supabase/util/supabase"
import GeneralCard from "@/components/cards/GeneralCard"
import CardSubHeader from "@/components/cards/CardSubHeader"
import CardBasedText from "@/components/cards/CardBasedText"
import GeneralInput from "@/components/forms/GeneralInput"
import PrimaryButton from "@/components/button/PrimaryButton"
import { X, Building2, Phone, Smartphone, Loader2, CheckCircle2, AlertCircle } from "lucide-react"

export default function AccountEditForm() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    organization: "",
    mobile: "",
    mobileSecondary: ""
  })
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    const fetchCurrentData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('organization_name, mobile_number, mobile_number_secondary')
          .eq('id', session.user.id)
          .single()
        
        if (data) {
          setFormData({
            organization: data.organization_name || "",
            mobile: data.mobile_number || "",
            mobileSecondary: data.mobile_number_secondary || ""
          })
        }
      }
    }
    fetchCurrentData()
  }, [])

  const handleSaveChanges = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error("No active session.")

      const { error } = await supabase
        .from('profiles')
        .update({
          organization_name: formData.organization,
          mobile_number: formData.mobile,
          mobile_number_secondary: formData.mobileSecondary
        })
        .eq('id', session.user.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Account information updated successfully!' })
      
      // Optional: delay before closing
      setTimeout(() => {
        router.refresh() // Refresh the page data
        router.back()
      }, 1500)

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
        <CardSubHeader className="text-2xl">Edit Account Info</CardSubHeader>
        
        {message && (
          <div className={`p-4 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-300 ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="size-5 shrink-0" /> : <AlertCircle className="size-5 shrink-0" />}
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        <form onSubmit={handleSaveChanges} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <CardBasedText className="text-sm font-semibold text-gray-700">Organization Name</CardBasedText>
            <GeneralInput 
              type="text"
              placeholder="e.g. FloodWatch"
              value={formData.organization}
              onChange={(e) => setFormData({...formData, organization: e.target.value})}
              disabled={loading}
            >
              <Building2 className="size-5 text-gray-400" />
            </GeneralInput>
          </div>

          <div className="flex flex-col gap-2">
            <CardBasedText className="text-sm font-semibold text-gray-700">Mobile Number</CardBasedText>
            <GeneralInput 
              type="text"
              placeholder="+63 9XX XXX XXXX"
              value={formData.mobile}
              onChange={(e) => setFormData({...formData, mobile: e.target.value})}
              disabled={loading}
            >
              <Phone className="size-5 text-gray-400" />
            </GeneralInput>
          </div>

          <div className="flex flex-col gap-2">
            <CardBasedText className="text-sm font-semibold text-gray-700">Secondary Mobile</CardBasedText>
            <GeneralInput 
              type="text"
              placeholder="+63 9XX XXX XXXX"
              value={formData.mobileSecondary}
              onChange={(e) => setFormData({...formData, mobileSecondary: e.target.value})}
              disabled={loading}
            >
              <Smartphone className="size-5 text-gray-400" />
            </GeneralInput>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <button 
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
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
