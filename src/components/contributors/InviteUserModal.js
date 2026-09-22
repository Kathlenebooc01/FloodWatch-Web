"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import FloatingModal from "../Modal/FloatingModal"
import GeneralCard from "../cards/GeneralCard"
import CardHeader from "../cards/CardHeader"
import CardBasedText from "../cards/CardBasedText"
import GeneralInput from "../forms/GeneralInput"
import PrimaryButton from "../button/PrimaryButton"
import { X, Mail, MapPin, ShieldCheck, Send, Landmark, Check, Loader2, ChevronDown, Building2, Shield } from "lucide-react"
import { supabase } from "@/supabase/util/supabase"

const ROLES = [  
  {
    value: "lgu_headmaster",
    label: "LGU Headmaster",
    icon: ShieldCheck,
    description: "Manages local flood monitoring and alerts",
  },
  {
    value: "provincial_admin",
    label: "Provincial Admin",
    icon: Landmark,
    description: "Oversees province-wide disaster operations",
  },
  {
    value: "national_admin",
    label: "National Admin",
    icon: Shield,
    description: "Full access to national-level platform management",
  },
]

export default function InviteUserModal({ onClose }) {
  const [selectedRole, setSelectedRole] = useState("")
  const [email, setEmail] = useState("")
  const [lguName, setLguName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [provinces, setProvinces] = useState([])
  const [loadingProvinces, setLoadingProvinces] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Municipality state
  const [municipalitySearch, setMunicipalitySearch] = useState("")
  const [selectedMunicipality, setSelectedMunicipality] = useState("")
  const [municipalities, setMunicipalities] = useState([])
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false)
  const [municipalityDropdownOpen, setMunicipalityDropdownOpen] = useState(false)
  const debounceTimerRef = useRef(null)

  useEffect(() => {
    async function fetchProvinces() {
      try {
        const { data, error } = await supabase
          .from('province')
          .select('province_id, name')
          .order('name')
        
        if (error) throw error
        setProvinces(data || [])
      } catch (err) {
        console.error("Error fetching provinces:", err)
      } finally {
        setLoadingProvinces(false)
      }
    }
    fetchProvinces()
  }, [])

  // Fetch municipalities when province changes (for LGU Headmaster)
  const selectedProvince = provinces.find((p) => p.name === lguName)

  const fetchMunicipalities = useCallback(async (searchTerm) => {
    if (!selectedProvince) {
      setMunicipalities([])
      return
    }

    setLoadingMunicipalities(true)
    try {
      let query = supabase
        .from('municipality_or_city')
        .select('municipality_id, name')
        .eq('province_id', selectedProvince.province_id)
        .order('name')
        .limit(50)

      if (searchTerm && searchTerm.trim()) {
        query = query.ilike('name', `%${searchTerm.trim()}%`)
      }

      const { data, error } = await query
      if (error) throw error

      // Deduplicate by name (some municipalities have duplicate entries for islands)
      const seen = new Set()
      const unique = (data || []).filter((mun) => {
        if (seen.has(mun.name)) return false
        seen.add(mun.name)
        return true
      })
      setMunicipalities(unique)
    } catch (err) {
      console.error("Error fetching municipalities:", err)
      setMunicipalities([])
    } finally {
      setLoadingMunicipalities(false)
    }
  }, [selectedProvince])

  // Load all municipalities when province is selected
  useEffect(() => {
    if (selectedProvince && selectedRole === "lgu_headmaster") {
      setSelectedMunicipality("")
      setMunicipalitySearch("")
      fetchMunicipalities("")
    } else {
      setMunicipalities([])
      setSelectedMunicipality("")
      setMunicipalitySearch("")
    }
  }, [selectedProvince, selectedRole, fetchMunicipalities])

  // Debounced search handler
  const handleMunicipalitySearchChange = (e) => {
    const value = e.target.value
    setMunicipalitySearch(value)
    setMunicipalityDropdownOpen(true)

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new debounce timer (300ms)
    debounceTimerRef.current = setTimeout(() => {
      fetchMunicipalities(value)
    }, 300)
  }

  // Clear municipality when role changes away from LGU headmaster
  useEffect(() => {
    if (selectedRole !== "lgu_headmaster") {
      setSelectedMunicipality("")
      setMunicipalitySearch("")
    }
  }, [selectedRole])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Explicit validation
    if (selectedRole !== "national_admin" && !lguName) {
      setError("Please select a province.")
      return
    }
    if (!selectedRole) {
      setError("Please select an account role.")
      return
    }
    if (selectedRole === "lgu_headmaster" && !selectedMunicipality) {
      setError("Please select a municipality.")
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Check existing invitations
      const { data: existingInvites, error: fetchError } = await supabase
        .from('invitations')
        .select('status')
        .eq('official_email', email)

      if (fetchError) throw fetchError

      if (existingInvites && existingInvites.length > 0) {
        const hasActiveInvite = existingInvites.some(
          (inv) => inv.status === 'pending' || inv.status === 'accepted'
        )
        if (hasActiveInvite) {
          setError("An active or accepted invitation already exists for this email.")
          setLoading(false)
          return
        }
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      // Expiration must be in 24 hours
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      const inviteCode = crypto.randomUUID()

      // Format LGU display name (e.g., 'Alcantara, Cebu' for LGU Headmaster, 'Cebu' for Provincial Admin)
      const resolvedLguName = selectedRole === "national_admin"
        ? null
        : selectedRole === "lgu_headmaster" && selectedMunicipality
          ? `${selectedMunicipality}, ${lguName}`
          : lguName

      // Insert into invitations table
      const insertData = {
        lgu_name: resolvedLguName,
        official_email: email,
        account_role: selectedRole,
        status: 'pending',
        invited_by: user.id,
        expires_at: expiresAt,
        invite_code: inviteCode
      }

      const { data: invite, error: insertError } = await supabase
        .from('invitations')
        .insert([insertData])
        .select()
        .single()

      if (insertError) throw insertError

      // Log to browser console for easy access during testing
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
      const inviteUrl = `${baseUrl}/register/provincial/${inviteCode}`
      console.log('%c=============================================', 'color: #0035A9; font-weight: bold')
      console.log('%c📨 TESTING PHASE - INVITE LINK GENERATED:', 'color: #0035A9; font-weight: bold; font-size: 14px')
      console.log(`%c${inviteUrl}`, 'color: #16a34a; font-weight: bold; font-size: 14px; text-decoration: underline')
      console.log('%c=============================================', 'color: #0035A9; font-weight: bold')

      // Try sending the email via an API route
      try {
        await fetch('/api/send-invite-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            lguName: resolvedLguName || lguName || "National",
            role: selectedRole,
            inviteCode
          })
        })
      } catch (emailErr) {
        console.error("Failed to send email API:", emailErr)
      }

      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 2000)

    } catch (err) {
      setError(err.message || "An error occurred while sending the invitation.")
    } finally {
      setLoading(false)
    }
  }

  const showMunicipality = selectedRole === "lgu_headmaster" && lguName
  const showProvince = selectedRole !== "national_admin"

  return (
    <FloatingModal>
        <GeneralCard className="w-full max-w-md grid gap-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center size-10 rounded-full bg-primary/10">
                        <Send className="size-5 text-primary" />
                    </span>
                    <div>
                        <CardHeader>Invite Contributor</CardHeader>
                        <CardBasedText className="text-gray-400 text-xs">Send an invitation to join the platform</CardBasedText>
                    </div>
                </div>
                <button 
                    type="button"
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                >
                    <X className="size-5 text-gray-400" />
                </button>
            </div>

            {/* Notifications */}
            {error && (
                <div className="bg-red-50 border text-center font-semibold border-red-200 text-red-500 p-3 rounded-md text-sm">
                    {error}
                </div>
            )}
            {success && (
                <div className="bg-green-50 border text-center font-semibold border-green-200 text-green-600 p-3 rounded-md text-sm">
                    Invitation sent successfully!
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="grid gap-4">
                {/* Email */}
                <div className="grid gap-1.5">
                    <CardBasedText className="text-sm font-semibold">Official Email</CardBasedText>
                    <GeneralInput 
                        type="email" 
                        placeholder="e.g. admin@lgu.gov.ph"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    >
                        <Mail className="size-5 text-gray-400" />
                    </GeneralInput>
                </div>

                {/* Role Picker */}
                <div className="grid gap-1.5">
                    <CardBasedText className="text-sm font-semibold">Account Role</CardBasedText>
                    <div className="grid grid-cols-3 gap-2">
                        {ROLES.map((role) => {
                            const Icon = role.icon
                            const isSelected = selectedRole === role.value
                            return (
                                <button
                                    key={role.value}
                                    type="button"
                                    onClick={() => setSelectedRole(role.value)}
                                    className={`
                                        relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer
                                        transition-all duration-200
                                        ${isSelected
                                            ? "border-primary bg-primary/5"
                                            : "border-gray-100 bg-gray-50/50 hover:border-gray-200 hover:bg-gray-50"
                                        }
                                    `}
                                >
                                    {isSelected && (
                                        <span className="absolute top-2 right-2 inline-flex items-center justify-center size-5 rounded-full bg-primary">
                                            <Check className="size-3 text-white" />
                                        </span>
                                    )}
                                    <span className={`
                                        inline-flex items-center justify-center size-10 rounded-full transition-colors
                                        ${isSelected ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-400"}
                                    `}>
                                        <Icon className="size-5" />
                                    </span>
                                    <span className={`text-xs font-semibold text-center ${isSelected ? "text-primary" : "text-gray-700"}`}>
                                        {role.label}
                                    </span>
                                    <span className="text-[10px] text-gray-400 text-center leading-tight">
                                        {role.description}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                    {/* Hidden input for form validation */}
                    <input type="hidden" name="role" value={selectedRole} />
                </div>

                {/* LGU / Province - Hidden for National Admin */}
                {showProvince && (
                    <div className="grid gap-1.5 relative">
                        <CardBasedText className="text-sm font-semibold">LGU / Province Name</CardBasedText>
                        <button
                            type="button"
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            disabled={loadingProvinces}
                            className={`input-layout transition-all duration-200 w-full flex items-center justify-between cursor-pointer ${loadingProvinces ? 'bg-gray-100 border-gray-100 opacity-70 cursor-not-allowed select-none' : 'hover:border-gray-300 focus:border-primary/50 focus:ring-2 focus:ring-primary/10'}`}
                        >
                            <div className="flex items-center gap-2">
                                {loadingProvinces ? <Loader2 className="size-5 text-gray-400 animate-spin" /> : <MapPin className="size-5 text-gray-400" />}
                                <span className={`text-sm ${lguName ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                                    {loadingProvinces ? "Loading provinces..." : (lguName || "Select a province")}
                                </span>
                            </div>
                            <ChevronDown className={`size-4 text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Custom Dropdown Menu */}
                        {dropdownOpen && !loadingProvinces && (
                            <>
                                {/* Backdrop to close dropdown when clicking outside */}
                                <div 
                                    className="fixed inset-0 z-40" 
                                    onClick={() => setDropdownOpen(false)}
                                />
                                
                                <div className="absolute top-full left-0 mt-2 w-full max-h-56 overflow-y-auto bg-white/80 backdrop-blur-2xl border border-gray-100 shadow-xl rounded-xl z-50 p-1.5 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {provinces.map((prov) => (
                                        <button
                                            key={prov.province_id}
                                            type="button"
                                            onClick={() => {
                                                setLguName(prov.name)
                                                setDropdownOpen(false)
                                            }}
                                            className={`flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg text-left transition-colors cursor-pointer ${lguName === prov.name ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                                        >
                                            <MapPin className={`size-4 ${lguName === prov.name ? 'text-primary' : 'text-gray-400'}`} />
                                            {prov.name}
                                            {lguName === prov.name && <Check className="size-4 ml-auto text-primary" />}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                        
                        {/* Hidden input for form values */}
                        <input type="hidden" name="lguName" value={lguName} />
                    </div>
                )}

                {/* Municipality - Only for LGU Headmaster after province is selected */}
                {showMunicipality && (
                    <div className="grid gap-1.5 relative">
                        <CardBasedText className="text-sm font-semibold">Municipality</CardBasedText>
                        <div className="relative">
                            <GeneralInput
                                type="text"
                                placeholder="Search municipality..."
                                value={selectedMunicipality || municipalitySearch}
                                onChange={(e) => {
                                    setSelectedMunicipality("")
                                    handleMunicipalitySearchChange(e)
                                }}
                                onFocus={() => {
                                    if (selectedMunicipality) {
                                        setMunicipalitySearch("")
                                        setSelectedMunicipality("")
                                    }
                                    setMunicipalityDropdownOpen(true)
                                    if (!municipalitySearch) fetchMunicipalities("")
                                }}
                            >
                                <Building2 className="size-5 text-gray-400" />
                            </GeneralInput>
                        </div>

                        {/* Municipality Dropdown */}
                        {municipalityDropdownOpen && (
                            <>
                                <div 
                                    className="fixed inset-0 z-40" 
                                    onClick={() => setMunicipalityDropdownOpen(false)}
                                />
                                
                                <div className="absolute top-full left-0 mt-2 w-full max-h-48 overflow-y-auto bg-white/80 backdrop-blur-2xl border border-gray-100 shadow-xl rounded-xl z-50 p-1.5 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {loadingMunicipalities ? (
                                        <div className="flex items-center justify-center py-4">
                                            <Loader2 className="size-5 text-gray-400 animate-spin" />
                                        </div>
                                    ) : municipalities.length > 0 ? (
                                        municipalities.map((mun) => (
                                            <button
                                                key={mun.municipality_id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedMunicipality(mun.name)
                                                    setMunicipalitySearch("")
                                                    setMunicipalityDropdownOpen(false)
                                                }}
                                                className={`flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg text-left transition-colors cursor-pointer ${selectedMunicipality === mun.name ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                                            >
                                                <Building2 className={`size-4 ${selectedMunicipality === mun.name ? 'text-primary' : 'text-gray-400'}`} />
                                                {mun.name}
                                                {selectedMunicipality === mun.name && <Check className="size-4 ml-auto text-primary" />}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="text-center text-gray-400 text-sm py-4">
                                            No municipalities found
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                        
                        <input type="hidden" name="municipality" value={selectedMunicipality} />
                    </div>
                )}

                {/* Submit */}
                <PrimaryButton type="submit" disabled={loading} className="flex items-center justify-center gap-2 mt-2">
                    {loading ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <Send className="size-4" />
                    )}
                    {loading ? "Sending Invitation..." : "Submit Invitation"}
                </PrimaryButton>
            </form>
        </GeneralCard>
    </FloatingModal>
  )
}
