"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import GeneralInput from "../forms/GeneralInput"
import CardBasedText from "../cards/CardBasedText"
import PrimaryButton from "../button/PrimaryButton"
import { Eye, EyeOff, Loader2, CheckCircle } from "lucide-react"
import { supabase } from "@/supabase/util/supabase"

export default function Form({ invitation }) {
  const router = useRouter()

  // Pre-filled from invitation (read-only)
  const email = invitation?.official_email || ""
  const role = invitation?.account_role || ""
  const province = invitation?.lgu_name || ""

  // Editable fields
  const [fullName, setFullName] = useState("")
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

  const roleName = role === "lgu_headmaster" ? "LGU Headmaster" : "Provincial Admin"

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    // Validate passwords
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)

    try {
      // 1. Sign up the user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) throw authError

      const userId = authData.user?.id
      if (!userId) throw new Error("Failed to create user account.")

      // 2. Call server action to insert profile and handle notifications (bypassing RLS)
      const { createProfileAfterSignUp } = await import("@/app/actions/auth")
      
      const result = await createProfileAfterSignUp({
        id: userId,
        full_name: fullName,
        email: email,
        mobile_number: phoneNumber,
        mobile_number_secondary: secondaryPhone || null,
        organization_name: organizationName || null,
        role: role,
        is_verified: false,
      }, invitation?.id)

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
          Your account has been created successfully. Please check your email to verify your account, then you can log in.
        </p>
        <p className="text-xs text-gray-400">Redirecting to login...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border text-center font-semibold border-red-200 text-red-500 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Pre-filled Invitation Fields (Read-only) */}
      <section className="grid lg:grid-cols-2 gap-2">
        <div>
          <CardBasedText className="font-medium">Email</CardBasedText>
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
          <CardBasedText className="font-medium">Full Name</CardBasedText>
          <GeneralInput
            placeholder="Enter your full name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div>
          <CardBasedText className="font-medium">Phone Number</CardBasedText>
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
          <CardBasedText className="font-medium">Password</CardBasedText>
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
        </div>
        <div>
          <CardBasedText className="font-medium">Confirm Password</CardBasedText>
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

      <PrimaryButton type="submit" disabled={loading} className="flex items-center justify-center gap-2">
        {loading && <Loader2 className="size-4 animate-spin" />}
        {loading ? "Creating Account..." : "Register Account"}
      </PrimaryButton>
    </form>
  )
}
