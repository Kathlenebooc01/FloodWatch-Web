import ImageError from "@/assets/images/401.png"
import Image from "next/image"
import Link from "next/link"
import { ShieldAlert, ArrowLeft } from "lucide-react"

export default function page() {
  return (
    <div className="max-w-lg w-full bg-white/70 backdrop-blur-2xl border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center animate-slide-left">
      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4 shadow-sm border border-red-100 relative">
        <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" style={{ animationDuration: '3s' }}></div>
        <ShieldAlert className="w-10 h-10 text-red-500 relative z-10" />
      </div>
      
      <div className="relative w-56 h-56 mb-2 drop-shadow-xl hover:scale-105 transition-transform duration-500">
        <Image 
          src={ImageError} 
          alt="Authentication Error" 
          fill
          className="object-contain"
          priority
        />
      </div>
      
      <h1 className="text-5xl font-black text-gray-800 mb-1 tracking-tighter">401</h1>
      <h2 className="text-xl font-bold text-gray-600 mb-4 tracking-tight">Unauthorized Access</h2>
      
      <p className="text-sm text-gray-500 mb-8 px-4 leading-relaxed font-medium">
        Oops! You don't have the necessary credentials to view this page. Please log in with an authorized account or contact support.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <Link href="/login" className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-[0_8px_20px_-8px_rgba(0,53,169,0.5)] hover:shadow-[0_12px_25px_-8px_rgba(0,53,169,0.6)] transform hover:-translate-y-0.5">
          <ArrowLeft className="w-5 h-5" />
          <span>Return to Login</span>
        </Link>
      </div>
    </div>
  )
}
