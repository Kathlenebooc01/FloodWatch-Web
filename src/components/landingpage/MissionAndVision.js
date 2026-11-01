import { ArrowUpRight, Eye, Target } from "lucide-react"

export default function MissionAndVision() {
  return (
    <section className="relative overflow-hidden bg-[#07162d] px-6 py-20 text-white sm:px-10 lg:px-12 lg:py-24">
      <div className="pointer-events-none absolute -right-24 -top-40 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-44 left-1/4 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-10 max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400">Why we&apos;re here</span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">Protecting Cebu, <span className="text-sky-400">together.</span></h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300">Connecting communities and responders when every second matters.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <article className="group relative overflow-hidden rounded-2xl border border-sky-200/15 bg-white/[0.06] p-7 shadow-[0_18px_55px_rgba(0,0,0,0.12)] backdrop-blur-sm transition-colors hover:bg-white/[0.09] sm:p-9">
            <div className="mb-7 flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-sky-300/20 bg-sky-400/10 text-sky-300"><Target size={25} strokeWidth={2} /></div>
              <ArrowUpRight size={20} className="text-sky-300/45 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" aria-hidden="true" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight">Our Mission</h3>
            <p className="mt-3 max-w-xl text-[15px] leading-7 text-slate-300">To empower every Cebuano with real-time, actionable intelligence during critical weather events, ensuring rapid response and coordinated rescue efforts across all LGUs.</p>
            <div className="mt-8 h-px bg-gradient-to-r from-sky-400/50 to-transparent" />
          </article>
          <article className="group relative overflow-hidden rounded-2xl border border-sky-200/15 bg-white/[0.06] p-7 shadow-[0_18px_55px_rgba(0,0,0,0.12)] backdrop-blur-sm transition-colors hover:bg-white/[0.09] sm:p-9">
            <div className="mb-7 flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-sky-300/20 bg-sky-400/10 text-sky-300"><Eye size={25} strokeWidth={2} /></div>
              <ArrowUpRight size={20} className="text-sky-300/45 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" aria-hidden="true" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight">Our Vision</h3>
            <p className="mt-3 max-w-xl text-[15px] leading-7 text-slate-300">A zero-casualty province where technology bridges the gap between citizens in distress and emergency responders, creating a resilient and prepared community.</p>
            <div className="mt-8 h-px bg-gradient-to-r from-sky-400/50 to-transparent" />
          </article>
        </div>
      </div>
    </section>
  )
}
