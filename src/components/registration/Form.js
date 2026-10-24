"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import GeneralInput from "../forms/GeneralInput"
import CardBasedText from "../cards/CardBasedText"
import PrimaryButton from "../button/PrimaryButton"
import { Eye, EyeOff, Loader2, CheckCircle, X } from "lucide-react"

export default function Form({ invitation }) {
  const router = useRouter()

  // Pre-filled from invitation (read-only)
  const email = invitation?.official_email || ""
  const role = invitation?.account_role || ""
  const province = invitation?.lgu_name || ""

  // Editable fields
  const [firstName, setFirstName] = useState("")
  const [middleName, setMiddleName] = useState("")
  const [lastName, setLastName] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [organizationName, setOrganizationName] = useState("")
  const [secondaryPhone, setSecondaryPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // UI State
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [activePolicy, setActivePolicy] = useState(null)
  const closeButtonRef = useRef(null)

  useEffect(() => {
    if (!activePolicy) return
    closeButtonRef.current?.focus()
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setActivePolicy(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [activePolicy])

  const roleMap = { national_admin: 'National Admin', provincial_admin: 'Provincial Admin', lgu_headmaster: 'LGU Headmaster', lgu_frontliner: 'LGU Frontliner', citizen: 'Citizen' };
  const roleName = roleMap[role] || role;
  const passwordChecks = [
    ["At least 8 characters", password.length >= 8],
    ["One uppercase letter (A–Z)", /[A-Z]/.test(password)],
    ["One lowercase letter (a–z)", /[a-z]/.test(password)],
    ["One number (0–9)", /[0-9]/.test(password)],
    ["One special character (e.g., @, #, $, !)", /[^A-Za-z0-9]/.test(password)],
  ]
  const valid = Boolean(email && firstName.trim() && lastName.trim() && phoneNumber.trim() && agreed && passwordChecks.every(([, met]) => met) && confirmPassword && password === confirmPassword)
  const required = <span className="text-red-600" aria-hidden="true"> *</span>

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!valid) {
      setError("Complete all required fields, use a valid password, and accept the policies.")
      return
    }

    setLoading(true)

    try {
      // The server validates the invitation and agreement before creating the account.
      const { createProfileAfterSignUp } = await import("@/app/actions/auth")
      
      const result = await createProfileAfterSignUp({
        first_name: firstName.trim(),
        middle_name: middleName.trim() || null,
        last_name: lastName.trim(),
        email: email,
        mobile_number: phoneNumber,
        mobile_number_secondary: secondaryPhone || null,
        organization_name: organizationName || null,
        role: role,
        is_verified: false,
      }, invitation?.id, { password, agreed })

      if (!result.success) {
        throw new Error(result.error || "Failed to create user profile.")
      }
      setSuccess(true)

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push("/login")
      }, 3000)

    } catch (err) {
      setError(err.message || "An error occurred during registration.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="grid gap-4 py-10 text-center">
        <div className="flex justify-center">
          <div className="size-16 bg-green-50 rounded-full flex items-center justify-center border border-green-100">
            <CheckCircle className="size-8 text-green-500" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-gray-900">Account Created!</h3>
        <p className="text-sm text-gray-500">
          Your account has been created successfully. You can now log in to the platform.
        </p>
        <p className="text-xs text-gray-400">Redirecting to login...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 [&_.input-layout]:min-h-11 [&_.input-layout]:px-3 [&_.input-layout_input]:min-w-0 [&_.input-layout_input]:p-0 [&_.input-layout_input]:leading-5">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border text-center font-semibold border-red-200 text-red-500 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Pre-filled Invitation Fields (Read-only) */}
      <section className="grid lg:grid-cols-2 gap-2">
        <div>
          <CardBasedText className="font-medium">Email Address{required}</CardBasedText>
          <GeneralInput value={email} disabled />
        </div>
        <div>
          <CardBasedText className="font-medium">Role</CardBasedText>
          <GeneralInput value={roleName} disabled />
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-2">
        <div>
          <CardBasedText className="font-medium">Province</CardBasedText>
          <GeneralInput value={province} disabled />
        </div>
      </section>

      {/* Editable Fields */}
      <section className="grid lg:grid-cols-2 gap-3">
        <div>
          <CardBasedText className="font-medium">First Name{required}</CardBasedText>
          <GeneralInput aria-label="First Name" placeholder="Enter your first name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div>
          <CardBasedText className="font-medium">Middle Name (Optional)</CardBasedText>
          <GeneralInput aria-label="Middle Name" placeholder="Enter your middle name (optional)" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
        </div>
        <div>
          <CardBasedText className="font-medium">Last Name{required}</CardBasedText>
          <GeneralInput aria-label="Last Name" placeholder="Enter your last name" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <div>
          <CardBasedText className="font-medium">Phone Number{required}</CardBasedText>
          <GeneralInput
            placeholder="Enter your phone number"
            required
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-3">
        <div>
          <CardBasedText className="font-medium">Organization Name</CardBasedText>
          <GeneralInput
            placeholder="Enter your organization name"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
          />
        </div>
        <div>
          <span className="flex justify-between">
            <CardBasedText className="font-medium">Secondary Phone Number</CardBasedText>
            <CardBasedText className="text-gray-500 text-xs">Optional</CardBasedText>
          </span>
          <GeneralInput
            placeholder="Enter secondary phone number"
            value={secondaryPhone}
            onChange={(e) => setSecondaryPhone(e.target.value)}
          />
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-3">
        <div>
          <CardBasedText className="font-medium">Password{required}</CardBasedText>
          <GeneralInput
            type={showPassword ? "text" : "password"}
            placeholder="Create a password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            iconRight={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="focus:outline-none cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="size-5 text-gray-500 hover:text-gray-700 transition-colors" />
                ) : (
                  <Eye className="size-5 text-gray-500 hover:text-gray-700 transition-colors" />
                )}
              </button>
            }
          />
          <ul className="mt-2 text-xs space-y-1" aria-label="Password requirements">
            {passwordChecks.map(([label, met]) => <li key={label} className={met ? "text-green-700" : "text-gray-600"}>{met ? "✓" : "○"} {label}</li>)}
          </ul>
        </div>
        <div>
          <CardBasedText className="font-medium">Confirm Password{required}</CardBasedText>
          <GeneralInput
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm your password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            iconRight={
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="focus:outline-none cursor-pointer"
              >
                {showConfirmPassword ? (
                  <EyeOff className="size-5 text-gray-500 hover:text-gray-700 transition-colors" />
                ) : (
                  <Eye className="size-5 text-gray-500 hover:text-gray-700 transition-colors" />
                )}
              </button>
            }
          />
        </div>
      </section>

      <div className="flex items-start gap-2 text-sm text-gray-700">
        <input id="registration-agreement" type="checkbox" className="mt-1" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} required />
        <span>
          <label htmlFor="registration-agreement">I have read and agree to the </label>
          <button type="button" onClick={() => setActivePolicy('terms')} className="text-primary underline">Terms &amp; Conditions</button>
          <label htmlFor="registration-agreement"> and </label>
          <button type="button" onClick={() => setActivePolicy('privacy')} className="text-primary underline">Data Privacy Policy</button>
          <label htmlFor="registration-agreement"> of FloodWatch Cebu.{required}</label>
        </span>
      </div>

      <PrimaryButton type="submit" disabled={loading || !valid} className="flex items-center justify-center gap-2">
        {loading && <Loader2 className="size-4 animate-spin" />}
        {loading ? "Creating Account..." : "Register Account"}
      </PrimaryButton>
      {activePolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setActivePolicy(null) }}>
          <div role="dialog" aria-modal="true" aria-label={activePolicy === 'terms' ? 'Terms & Conditions' : 'Data Privacy Policy'} className="flex h-[min(90vh,800px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h2 className="font-semibold text-gray-900">{activePolicy === 'terms' ? 'Terms & Conditions' : 'Data Privacy Policy'}</h2>
              <button ref={closeButtonRef} type="button" onClick={() => setActivePolicy(null)} aria-label="Close policy" className="rounded-md p-2 text-gray-600 hover:bg-gray-100"><X className="size-5" /></button>
            </div>
            <iframe title={activePolicy === 'terms' ? 'Terms & Conditions' : 'Data Privacy Policy'} src={activePolicy === 'terms' ? '/terms-and-conditions' : '/privacy-policy'} className="min-h-0 w-full flex-1 border-0" />
          </div>
        </div>
      )}
    </form>
  )
}
