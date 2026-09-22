import GeneralCard from "../cards/GeneralCard"
import { ChevronLeft, ShieldCheck, Building2, Lock, Sparkles } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import registrationBg from "@/assets/images/registration-bg.png"
import CardSubHeader from "../cards/CardSubHeader"
import CardBasedText from "../cards/CardBasedText"
import CardHeader from "../cards/CardHeader"
import Form from "./Form"
export default function RegistrationCard({ invitation }) {
  return (
    <div className="w-full max-w-6xl mx-auto animate-slide-left py-10 px-4">
      <GeneralCard className="py-0 px-0 border-0 overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] bg-white/70 backdrop-blur-2xl grid grid-cols-1 lg:grid-cols-12  rounded-[2.5rem]">
          
          {/* Left Side - Visual Storytelling (5 columns) */}
          <div className="lg:col-span-5 relative bg-primary flex flex-col justify-between p-10 sm:p-14 overflow-hidden">
              {/* Background Decoration */}
              <div className="absolute inset-0 z-0">
                  <Image 
                      src={registrationBg} 
                      alt="Registration Background"
                      fill
                      className="object-cover opacity-50 mix-blend-overlay scale-110"
                      priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary via-primary/95 to-transparent" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-400/20 via-transparent to-transparent" />
              </div>

              <div className="relative z-10">
                  <Link 
                      href="/" 
                      className="inline-flex items-center gap-3 text-white font-bold transition-all group"
                  >
                      <div className="p-2.5 rounded-2xl bg-white/20 transition-all">
                        <ChevronLeft className="size-4" />
                      </div>
                      <span className="text-sm tracking-wide">Back to Home</span>
                  </Link>

                  <div className="mt-20 space-y-8">
                      
                      <div className="space-y-6">
                          <h1 className="text-5xl sm:text-7xl font-black text-white leading-[1.05] tracking-tighter">
                              You are <br />
                              <span className="text-accent drop-shadow-[0_0_20px_rgba(191,232,255,0.4)]">Invited!</span>
                          </h1>
                          <p className="text-blue-100/80 text-xl leading-relaxed font-medium max-w-sm">
                              Establish your administrative dashboard to oversee local government units and monitor regional water levels.
                          </p>
                      </div>
                  </div>
              </div>

              {/* Animated Floating Element */}
              <div className="absolute -bottom-20 -right-20 size-80 bg-accent/10 rounded-full blur-[80px]" />
          </div>

          {/* Right Side - Form Container (7 columns) */}
          <div className="lg:col-span-7 bg-white p-5  flex flex-col justify-start relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gray-50/50 rounded-full -translate-y-1/2 translate-x-1/2 -z-0" />
              
              <div className="mb-5 w-full mx-auto relative z-10">
                  <div className="">
                      <div className="flex items-center gap-4 mb-3">
                          <div className="h-1.5 w-16 bg-primary rounded-full shadow-[0_0_15px_rgba(0,53,169,0.3)]" />
                          <div className="flex items-center gap-2">
                            <CardSubHeader className="text-primary font-black text-xs uppercase tracking-[0.2em]">Onboarding Process</CardSubHeader>
                          </div>
                      </div>
                      <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">Create your <br/>account</h1>
                      <CardBasedText className="text-gray-400 font-semibold leading-snug">Welcome to FloodWatch. Provide your details to begin.</CardBasedText>
                  </div>
                  </div>
            <div>
              <Form invitation={invitation}/> 
            </div>

          </div>
          
      </GeneralCard>
    </div>
  )
}
