import { Bell, Camera, MapPinned, Radio, Siren } from "lucide-react"

export default function CitizenFeatures() {
  return (
    <section className="bg-[#f3f7fc] px-6 py-20 sm:px-10 lg:px-12 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#1260c7]"><span className="h-1.5 w-1.5 rounded-full bg-[#2c8aff]" /> For the public</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0a1e3a] sm:text-4xl lg:text-5xl">Ready when it matters.</h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-600">Essential tools to help Cebuano communities stay informed, connected, and prepared.</p>
          </div>
          <span className="hidden rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#1260c7] shadow-sm md:inline-flex">Citizen Features</span>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <article className="relative flex min-h-[310px] flex-col justify-between overflow-hidden rounded-[28px] bg-[#081b38] p-7 text-white shadow-[0_22px_50px_rgba(8,27,56,0.17)] sm:p-9 lg:col-span-2">
            <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full border border-white/10 bg-red-500/10" />
            <div className="pointer-events-none absolute right-16 top-10 h-44 w-44 rounded-full border border-white/10" />
            <div className="relative z-10 flex items-start justify-between gap-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-red-400/25 bg-red-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-red-200"><Radio size={13} /> Critical priority</span>
              <span className="text-xs font-semibold tracking-[0.2em] text-white/35">01 / 04</span>
            </div>
            <div className="relative z-10 mt-8 flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
              <div className="max-w-lg">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/15 text-red-300"><Siren size={26} /></div>
                <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">One-Tap SOS</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">Instantly broadcast your exact GPS coordinates to the nearest LGU command center and predefined emergency contacts. Operates even on low bandwidth.</p>
              </div>
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[26px] border border-red-300/30 bg-gradient-to-br from-[#f63c47] to-[#a90818] text-2xl font-black tracking-wide text-white shadow-[0_0_0_9px_rgba(230,55,68,0.09),0_16px_32px_rgba(0,0,0,0.35)]" aria-label="SOS feature preview">SOS</div>
            </div>
          </article>

          <article className="group flex min-h-[310px] flex-col rounded-[28px] border border-[#e1eaf5] bg-white p-7 shadow-[0_12px_35px_rgba(22,56,100,0.05)] transition-all hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(22,56,100,0.1)] sm:p-9">
            <div className="mb-auto flex items-start justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e9f2ff] text-[#1260c7]"><MapPinned size={25} /></div><span className="text-xs font-semibold tracking-[0.2em] text-slate-300">02 / 04</span></div>
            <h3 className="mt-8 text-xl font-bold text-[#0a1e3a]">Participatory Incident</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">Participate in local safety by snapping photos of hazards, and see what others are reporting in your exact area.</p>
          </article>

          <article className="group flex min-h-[240px] flex-col rounded-[28px] border border-[#e1eaf5] bg-white p-7 shadow-[0_12px_35px_rgba(22,56,100,0.05)] transition-all hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(22,56,100,0.1)] sm:p-9">
            <div className="mb-auto flex items-start justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e9f2ff] text-[#1260c7]"><Camera size={25} /></div><span className="text-xs font-semibold tracking-[0.2em] text-slate-300">03 / 04</span></div>
            <h3 className="mt-8 text-xl font-bold text-[#0a1e3a]">Snap &amp; Report</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">Submit geo-tagged photos of rising water levels to update the central map.</p>
          </article>

          <article className="group flex min-h-[240px] flex-col rounded-[28px] border border-[#e1eaf5] bg-white p-7 shadow-[0_12px_35px_rgba(22,56,100,0.05)] transition-all hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(22,56,100,0.1)] sm:p-9 lg:col-span-2">
            <div className="mb-auto flex items-start justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e9f2ff] text-[#1260c7]"><Bell size={25} /></div><span className="text-xs font-semibold tracking-[0.2em] text-slate-300">04 / 04</span></div>
            <h3 className="mt-8 text-xl font-bold text-[#0a1e3a]">Official Alerts</h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">Receive urgent notifications directly from your local LGU regarding localized flash flood warnings and evacuation orders.</p>
          </article>
        </div>
      </div>
    </section>
  )
}
