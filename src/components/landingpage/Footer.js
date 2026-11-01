import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import FloodWatchLogo from "@/assets/images/logofloodwatch.png"

export default function Footer() {
  return (
    <footer className="bg-[#06152b] px-6 pt-16 text-white sm:px-10 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-7 border-b border-white/10 pb-14 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400">FloodWatch Cebu</span>
            <h2 className="mt-3 max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">For safer communities.<br /><span className="text-sky-400">For every Cebuano.</span></h2>
          </div>
          <Link href="/login" className="inline-flex w-fit items-center gap-3 rounded-xl bg-[#2878e9] px-6 py-3.5 text-sm font-bold shadow-[0_12px_30px_rgba(20,95,214,0.24)] transition-colors hover:bg-[#3b8dff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300">Go to Command Center <ArrowUpRight size={18} /></Link>
        </div>

        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3" aria-label="FloodWatch Cebu home"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white"><Image src={FloodWatchLogo} alt="" width={42} height={42} className="h-10 w-10 object-contain" /></span><span className="text-xl font-extrabold tracking-tight">FloodWatch <span className="text-sky-400">Cebu</span></span></Link>
            <p className="mt-4 max-w-sm text-sm leading-7 text-slate-400">Connecting the public and local responders with the tools to act during floods and severe weather.</p>
          </div>
          <div><h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Explore</h3><nav className="mt-5 flex flex-col items-start gap-3 text-sm font-medium text-slate-200" aria-label="Footer navigation"><Link href="#home" className="hover:text-sky-400">Home</Link><Link href="#features" className="hover:text-sky-400">Features</Link><Link href="#download" className="hover:text-sky-400">Download</Link></nav></div>
          <div><h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Platform</h3><div className="mt-5 flex flex-col items-start gap-3 text-sm font-medium text-slate-200"><Link href="/login" className="hover:text-sky-400">Sign In</Link><Link href="/docs" className="hover:text-sky-400">API Documentation</Link></div></div>
        </div>

        <div className="flex flex-col justify-between gap-2 border-t border-white/10 py-6 text-xs text-slate-500 sm:flex-row"><span>© {new Date().getFullYear()} FloodWatch Cebu</span><span>Tactical clarity when seconds count.</span></div>
      </div>
    </footer>
  )
}
