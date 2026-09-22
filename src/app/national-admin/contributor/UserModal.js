"use client"
import { useState, useEffect } from "react"
import SideModal from "@/components/Modal/SideModal"
import SingleLineSkeleton from "@/components/skeleton/SingleLineSkeleton"
import CardBasedText from "@/components/cards/CardBasedText"
import CardHeader from "@/components/cards/CardHeader"
import CardSubHeader from "@/components/cards/CardSubHeader"
import { Shield, X, UserRoundPlus, User, MapPin, MapPinHouse, UserRoundCog, Building, Phone } from "lucide-react"
import PrimaryButton from "@/components/button/PrimaryButton"
import { supabase } from "@/supabase/util/supabase"

export default function UserModal({ invitationId, onClose }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendError, setResendError] = useState(null)
  
  useEffect(() => {
    async function fetchData() {
      try {
        // 1. Fetch the invitation
        const { data: inv, error: invError } = await supabase
          .from("invitations")
          .select("*")
          .eq("id", invitationId)
          .single()
        
        if (invError) throw invError

        // 2. If accepted, fetch the user's profile
        let userProfile = null
        if (inv.status === "accepted") {
          const { data: prof } = await supabase
            .from("profiles")
            .select("*")
            .eq("email", inv.official_email)
            .single()
          userProfile = prof
        }

        // 3. Fetch the inviter's profile
        let inviterProfile = null
        if (inv.invited_by) {
          const { data: inviter } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", inv.invited_by)
            .single()
          inviterProfile = inviter
        }

        setData({
          invitation: inv,
          profile: userProfile,
          inviter: inviterProfile
        })
      } catch (err) {
        console.error("Error fetching user details:", err)
      } finally {
        setLoading(false)
      }
    }
    
    if (invitationId) {
      fetchData()
    }
  }, [invitationId])

  if (loading || !data) {
    return (
      <SideModal>
        <div className='flex p-2 gap-2 bg-white sticky top-0 items-center'>
            <span className="modal-icon-button" onClick={onClose}>
                <X className="size-5" />
            </span>
            <CardHeader className="text-gray-500">Contributor's Information</CardHeader>
        </div>
        <div className="p-4 grid gap-4">
            <SingleLineSkeleton />
            <SingleLineSkeleton />
            <SingleLineSkeleton />
            <SingleLineSkeleton />
        </div>
      </SideModal>
    )
  }

  const { invitation, profile, inviter } = data
  const status = invitation.status?.toLowerCase() || ""
  
  // Account Data to Display
  const email = profile?.email || invitation.official_email
  const roleName = invitation.account_role === "lgu_headmaster" ? "LGU Headmaster" : invitation.account_role === "national_admin" ? "National Admin" : "Provincial Admin"
  const orgName = profile?.organization_name || "Not specified"
  const phone = profile?.mobile_number || "Not specified"
  const joinedDate = profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : new Date(invitation.created_at).toLocaleDateString()
  const verificationStatus = profile?.is_verified ? "Verified" : "Not Verified"
  
  // Parse Province & Municipality from lgu_name (e.g., 'Alcantara, Cebu' or 'Cebu')
  let provinceName = invitation.lgu_name || "Not specified"
  let municipalityName = "Not specified"
  if (invitation.lgu_name && invitation.lgu_name.includes(",")) {
    const parts = invitation.lgu_name.split(",").map((s) => s.trim())
    municipalityName = parts[0] || "Not specified"
    provinceName = parts[1] || "Not specified"
  } else if (invitation.account_role === "lgu_headmaster") {
    municipalityName = invitation.lgu_name || "Not specified"
  }

  // Status Banner styling
  let statusBannerClass = "default-banner"
  if (status === "pending") statusBannerClass = "default-banner-amber"
  if (status === "accepted") statusBannerClass = "default-banner-green"
  if (status === "expired") statusBannerClass = "default-banner-red"

  // Disabled for pending (already sent) and accepted (already used) — only expired can be resent
  const isResendDisabled = status === "pending" || status === "accepted" || resendLoading

  const handleResend = async () => {
    setResendLoading(true)
    setResendError(null)
    setResendSuccess(false)
    try {
      const newCode = crypto.randomUUID()
      const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

      const { error: updateError } = await supabase
        .from("invitations")
        .update({
          status: "pending",
          invite_code: newCode,
          expires_at: newExpiry,
        })
        .eq("id", invitation.id)

      if (updateError) throw updateError

      // Try sending the email
      try {
        await fetch("/api/send-invite-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: invitation.official_email,
            lguName: invitation.lgu_name,
            role: invitation.account_role,
            inviteCode: newCode,
          }),
        })
      } catch (emailErr) {
        console.error("Failed to send resend email:", emailErr)
      }

      // Update local state so the banner and button reflect the new status
      setData((prev) => ({
        ...prev,
        invitation: { ...prev.invitation, status: "pending", invite_code: newCode, expires_at: newExpiry },
      }))
      setResendSuccess(true)
    } catch (err) {
      setResendError(err.message || "Failed to resend invitation.")
    } finally {
      setResendLoading(false)
    }
  }

  // Inviter Data
  const inviterEmail = inviter?.email || "Unknown"
  const inviterRole = inviter?.role === "national_admin" ? "National Admin" : (inviter?.role || "Admin")
  const inviterPhone = inviter?.mobile_number || "Not specified"
  const inviterOrg = inviter?.organization_name || "Not specified"

  return (
    <SideModal>
        {/* Header */}
        <div className='flex p-4 gap-3 bg-white sticky top-0 items-center'>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors focus:outline-none" onClick={onClose}>
                <X className="size-5 text-gray-500" />
            </button>
            <h2 className="text-lg font-bold text-gray-800 tracking-tight">
                Contributor Profile
            </h2>
        </div>

        {/* Content */}
        <section className="grid gap-8 p-3">
            
            {/* Account Info Card */}
            <div className="flex flex-col gap-3">
                <CardSubHeader className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                    Account Details
                </CardSubHeader>
                <div className="bg-white border border-gray-200/60 shadow-sm rounded-xl p-5 flex flex-col gap-5">
                    
                    {/* Top Section: Email & Status */}
                    <div className="flex justify-between items-start pb-5 border-b border-gray-100">
                        <div className="flex gap-3 items-center overflow-hidden">
                            <div className="p-2.5 bg-blue-50/50 rounded-full shrink-0 border border-blue-100/50">
                                <User className="text-blue-600 size-5"/>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-400 font-medium mb-0.5">Primary Email</span>
                                <CardBasedText className="font-semibold text-gray-900 truncate text-sm" title={email}>
                                    {email}
                                </CardBasedText>
                            </div>
                        </div>
                        <div className={`${statusBannerClass}`}>
                            {status || "Unknown"}
                        </div>
                    </div>

                    {/* Grid Info Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-4"> 
                        <div className="flex items-start gap-3">
                            <MapPin className="text-gray-400 size-4.5 shrink-0 mt-0.5"/>
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-400 font-medium mb-0.5">Province</span>
                                <CardBasedText className="truncate text-gray-700 text-sm font-medium" title={provinceName}>{provinceName}</CardBasedText>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <MapPinHouse className="text-gray-400 size-4.5 shrink-0 mt-0.5"/>
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-400 font-medium mb-0.5">Municipality</span>
                                <CardBasedText className="truncate text-gray-700 text-sm font-medium" title={municipalityName}>{municipalityName}</CardBasedText>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <UserRoundCog className="text-gray-400 size-4.5 shrink-0 mt-0.5"/>
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-400 font-medium mb-0.5">Role</span>
                                <CardBasedText className="truncate text-gray-700 text-sm font-medium" title={roleName}>{roleName}</CardBasedText>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Building className="text-gray-400 size-4.5 shrink-0 mt-0.5"/>
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-400 font-medium mb-0.5">Organization</span>
                                <CardBasedText className="truncate text-gray-700 text-sm font-medium" title={orgName}>{orgName}</CardBasedText>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Phone className="text-gray-400 size-4.5 shrink-0 mt-0.5"/>
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-400 font-medium mb-0.5">Phone Number</span>
                                <CardBasedText className="truncate text-gray-700 text-sm font-medium" title={phone}>{phone}</CardBasedText>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Shield className="text-gray-400 size-4.5 shrink-0 mt-0.5"/>
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-400 font-medium mb-0.5">Verification</span>
                                <CardBasedText className="truncate text-gray-700 text-sm font-medium" title={verificationStatus}>{verificationStatus}</CardBasedText>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <UserRoundPlus className="text-gray-400 size-4.5 shrink-0 mt-0.5"/>
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-400 font-medium mb-0.5">Joined Date</span>
                                <CardBasedText className="truncate text-gray-700 text-sm font-medium" title={joinedDate}>{joinedDate}</CardBasedText>
                            </div>
                        </div>
                    </div>

                    {/* Feedback messages */}
                    {resendSuccess && (
                      <p className="text-xs text-green-600 font-medium text-center">Invitation resent successfully!</p>
                    )}
                    {resendError && (
                      <p className="text-xs text-red-500 font-medium text-center">{resendError}</p>
                    )}

                    {/* Action Button */}
                    <div className="pt-2">
                        <PrimaryButton
                          disabled={isResendDisabled}
                          onClick={handleResend}
                          className="w-full py-2.5 shadow-sm flex items-center justify-center gap-2"
                        >
                            {resendLoading ? "Resending..." : "Resend Invitation"}
                        </PrimaryButton>
                    </div>
                </div>
            </div>
            
            {/* Inviter Info Card */}
            {inviter && (
                <div className="flex flex-col gap-3">
                    <CardSubHeader className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                        Invited By
                    </CardSubHeader>
                    <div className="bg-white border border-gray-200/60 shadow-sm rounded-xl p-5 flex flex-col gap-5">
                        
                        {/* Top Section: Email & Role */}
                        <div className="flex justify-between items-start pb-5 border-b border-gray-100">
                            <div className="flex gap-3 items-center overflow-hidden">
                                <div className="p-2.5 bg-gray-50 rounded-full shrink-0 border border-gray-100">
                                    <User className="text-gray-500 size-5"/>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-400 font-medium mb-0.5">Inviter Email</span>
                                    <CardBasedText className="font-semibold text-gray-900 truncate text-sm" title={inviterEmail}>
                                        {inviterEmail}
                                    </CardBasedText>
                                </div>
                            </div>
                            <div className='default-banner'>
                                {inviterRole}
                            </div>
                        </div>

                        {/* Grid Info Section */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-4"> 
                            <div className="flex items-start gap-3">
                                <Building className="text-gray-400 size-4.5 shrink-0 mt-0.5"/>
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-400 font-medium mb-0.5">Organization</span>
                                    <CardBasedText className="truncate text-gray-700 text-sm font-medium" title={inviterOrg}>{inviterOrg}</CardBasedText>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Phone className="text-gray-400 size-4.5 shrink-0 mt-0.5"/>
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-400 font-medium mb-0.5">Phone Number</span>
                                    <CardBasedText className="truncate text-gray-700 text-sm font-medium" title={inviterPhone}>{inviterPhone}</CardBasedText>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    </SideModal>
  )
}
