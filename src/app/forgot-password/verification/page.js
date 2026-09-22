"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/supabase/util/supabase"

import GeneralCard from "@/components/cards/GeneralCard"
import CardBasedText from "@/components/cards/CardBasedText"
import CardSubHeader from "@/components/cards/CardSubHeader"
import GeneralInput from "@/components/forms/GeneralInput"
import PrimaryButton from "@/components/button/PrimaryButton"
import OTPInput from "./OTP-Input"
import { SendHorizonal, Send, ChevronRight, CheckCircle2 } from "lucide-react"
import Link from "next/link"

export default function VerificationPage() {
  const router = useRouter()

  const [step, setStep] = useState(1) // 1: Email, 2: OTP
  
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: "", text: "" })

  // Countdown timer for OTP expiry (10 minutes = 600 seconds)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  // Phase 1: Verify email exists, then send OTP token
  const handleSendOTP = async () => {
    if (!email) return setMessage({ type: "error", text: "Please enter an email address." })
    
    setLoading(true)
    setMessage({ type: "", text: "" })

    // First, verify the email exists in the profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (profileError || !profile) {
      setMessage({ type: "error", text: "No account found with this email address." })
      setLoading(false)
      return
    }

    // Email exists — send OTP token (not a magic link)
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: false, // Do NOT create a new user if email doesn't exist in auth
      }
    })

    if (error) {
      setMessage({ type: "error", text: error.message })
    } else {
      setMessage({ type: "success", text: "OTP sent! Check your email. Code expires in 10 minutes." })
      setCountdown(600) // 10 minutes
      setStep(2)
    }
    setLoading(false)
  }

  // Phase 2: Verify the 8-digit OTP code
  const handleVerifyOTP = async () => {
    if (otp.length !== 8) return setMessage({ type: "error", text: "Please enter all 8 digits." })
    
    setLoading(true)
    setMessage({ type: "", text: "" })

    const { error } = await supabase.auth.verifyOtp({
      email: email,
      token: otp,
      type: 'email'
    })

    if (error) {
      setMessage({ type: "error", text: "Invalid or expired code." })
    } else {
      // OTP verified — user is now authenticated with a recovery session.
      sessionStorage.setItem('allowPasswordReset', 'true')
      // Redirect to the reset-password page where they can set a new password.
      router.push('/forgot-password/reset-password')
      return
    }
    setLoading(false)
  }

  // Resend OTP handler
  const handleResendOTP = async () => {
    setLoading(true)
    setMessage({ type: "", text: "" })
    setOtp("")

    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: false,
      }
    })

    if (error) {
      setMessage({ type: "error", text: error.message })
    } else {
      setMessage({ type: "success", text: "New OTP sent! Check your email." })
      setCountdown(600) // Reset to 10 minutes
    }
    setLoading(false)
  }

  return (
    <GeneralCard className='w-full lg:w-lg'>
        <div className="grid gap-4">
            
            {/* HEADER */}
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                  <span className="summary-data-icon">
                    <Send className="size-5"/>
                  </span>
                  <div>
                    <CardSubHeader>
                      {step === 1 && "Password Recovery"}
                      {step === 2 && "Verification"}
                    </CardSubHeader>
                    <CardBasedText className='text-gray-500'>
                      {step === 1 && "Enter your email to receive a code"}
                      {step === 2 && "Enter the 8-digit code we sent you"}
                    </CardBasedText>
                  </div>
                </div>
                
                <Link href="/login" className="flex gap-2 items-center">
                    <CardBasedText className='text-xs text-gray-500'>Back to Login</CardBasedText>
                    <span className="modal-icon-button"><ChevronRight className="size-5"/></span>
                </Link>
            </div>

            {/* ERROR / SUCCESS ALERTS */}
            {message.text && (
              <div className={`p-3 rounded-lg text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                {message.text}
              </div>
            )}

            {/* DYNAMIC FORM BODY */}
            <div className="grid gap-4">
                
                {/* STEP 1: EMAIL */}
                {step === 1 && (
                  <>
                    <div>
                        <CardBasedText className="font-medium">Email Address</CardBasedText>
                        <GeneralInput 
                          placeholder="sample@gmail.com" 
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={loading}
                        />
                    </div>
                    <PrimaryButton 
                      className='flex gap-3 items-center justify-center' 
                      onClick={handleSendOTP} 
                      disabled={loading}
                    >
                      {loading ? "Verifying..." : "Send OTP"} <SendHorizonal className="size-5"/>
                    </PrimaryButton>
                  </>
                )}

                {/* STEP 2: OTP */}
                {step === 2 && (
                  <>
                    <div className="w-full">
                        <OTPInput 
                          value={otp} 
                          onChange={(val) => setOtp(val)} 
                          disabled={loading}
                        />
                    </div>

                    {/* Countdown Timer */}
                    <div className="flex justify-between items-center">
                      <CardBasedText className={`text-xs font-semibold ${countdown <= 60 ? 'text-red-500' : 'text-gray-500'}`}>
                        {countdown > 0 
                          ? `Code expires in ${formatTime(countdown)}`
                          : "Code expired"
                        }
                      </CardBasedText>
                      
                      <button 
                        type="button"
                        onClick={handleResendOTP}
                        disabled={loading || countdown > 540}
                        className="text-xs text-primary font-semibold hover:underline cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Resend Code
                      </button>
                    </div>

                    <PrimaryButton 
                      className='flex gap-3 items-center justify-center' 
                      onClick={handleVerifyOTP} 
                      disabled={loading}
                    >
                      {loading ? "Verifying..." : "Verify Code"} <CheckCircle2 className="size-5"/>
                    </PrimaryButton>
                  </>
                )}

            </div>
        </div>
    </GeneralCard>
  )
}